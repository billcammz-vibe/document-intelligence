import "server-only";
import { query, withTransaction, toVectorLiteral } from "@/lib/db";
import { env } from "@/lib/env";
import { parsePdf } from "@/lib/ingestion/pdf";
import { chunkPages } from "@/lib/ingestion/chunk";
import { getEmbeddingProvider } from "@/lib/embeddings/index";
import type { DocumentSummary } from "@/types";

interface DocumentRow {
  id: string;
  name: string;
  page_count: number;
  byte_size: number;
  status: DocumentSummary["status"];
  error: string | null;
  created_at: string;
}

export function rowToSummary(r: DocumentRow): DocumentSummary {
  return {
    id: r.id,
    name: r.name,
    pageCount: r.page_count,
    byteSize: r.byte_size,
    status: r.status,
    error: r.error,
    createdAt: r.created_at,
  };
}

const CHUNK_INSERT_BATCH = 50;

/**
 * Full ingestion for one PDF: store bytes, extract per-page text, chunk, embed,
 * and persist chunks. Always resolves with a summary — on failure the document
 * row is marked `error` and returned rather than thrown, so a multi-file upload
 * reports per file.
 */
export async function ingestPdf(input: {
  name: string;
  bytes: Buffer;
}): Promise<DocumentSummary> {
  const [doc] = await query<DocumentRow>(
    `insert into documents (name, byte_size, status)
     values ($1, $2, 'processing')
     returning *`,
    [input.name, input.bytes.byteLength],
  );

  try {
    await query(
      `insert into document_files (document_id, data) values ($1, $2)`,
      [doc.id, input.bytes],
    );

    const parsed = await parsePdf(new Uint8Array(input.bytes));

    for (const p of parsed.pages) {
      await query(
        `insert into pages (document_id, page, content) values ($1, $2, $3)`,
        [doc.id, p.page, p.content],
      );
    }

    const chunks = chunkPages(parsed.pages, {
      size: env.CHUNK_SIZE,
      overlap: env.CHUNK_OVERLAP,
    });

    if (chunks.length === 0) {
      throw new Error("No extractable text found in this PDF (is it a scan?).");
    }

    const provider = getEmbeddingProvider();
    const vectors = await provider.embed(
      chunks.map((c) => c.content),
      "document",
    );
    if (vectors.length !== chunks.length) {
      throw new Error("Embedding count did not match chunk count.");
    }
    if (vectors[0]?.length !== provider.dimensions) {
      throw new Error(
        `Embedding dimension ${vectors[0]?.length} != configured ${provider.dimensions}. ` +
          `Update EMBEDDING_DIMENSIONS and re-run \`npm run db:reset\`.`,
      );
    }

    await withTransaction(async (client) => {
      for (let i = 0; i < chunks.length; i += CHUNK_INSERT_BATCH) {
        const slice = chunks.slice(i, i + CHUNK_INSERT_BATCH);
        const values: string[] = [];
        const params: unknown[] = [];
        slice.forEach((c, j) => {
          const base = j * 5;
          values.push(
            `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}::vector)`,
          );
          params.push(
            doc.id,
            c.page,
            c.chunkIndex,
            c.content,
            toVectorLiteral(vectors[i + j]),
          );
        });
        await client.query(
          `insert into chunks (document_id, page, chunk_index, content, embedding)
           values ${values.join(", ")}`,
          params,
        );
      }

      await client.query(
        `update documents set page_count = $2, status = 'ready', error = null where id = $1`,
        [doc.id, parsed.pageCount],
      );
    });

    const [updated] = await query<DocumentRow>(
      `select * from documents where id = $1`,
      [doc.id],
    );
    return rowToSummary(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingestion failed.";
    const [failed] = await query<DocumentRow>(
      `update documents set status = 'error', error = $2 where id = $1 returning *`,
      [doc.id, message],
    );
    return rowToSummary(failed);
  }
}
