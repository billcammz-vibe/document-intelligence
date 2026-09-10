import "server-only";
import { query, toVectorLiteral } from "@/lib/db";
import { env } from "@/lib/env";
import { getEmbeddingProvider } from "@/lib/embeddings/index";
import type { RetrievedChunk } from "@/types";

interface MatchRow {
  chunk_id: string;
  document_id: string;
  document_name: string;
  page: number;
  chunk_index: number;
  content: string;
  similarity: number;
}

export interface RetrieveOptions {
  documentIds?: string[];
  topK?: number;
}

/** Embed the question and pull the top-k most similar chunks. */
export async function retrieve(
  question: string,
  opts: RetrieveOptions = {},
): Promise<RetrievedChunk[]> {
  const topK = opts.topK ?? env.RETRIEVAL_TOP_K;
  const filter =
    opts.documentIds && opts.documentIds.length > 0 ? opts.documentIds : null;

  const provider = getEmbeddingProvider();
  const [vector] = await provider.embed([question], "query");

  const rows = await query<MatchRow>(
    `select * from match_chunks($1::vector, $2, $3::uuid[])`,
    [toVectorLiteral(vector), topK, filter],
  );

  return rows.map((r) => ({
    chunkId: r.chunk_id,
    documentId: r.document_id,
    documentName: r.document_name,
    page: r.page,
    chunkIndex: r.chunk_index,
    content: r.content,
    similarity: Number(r.similarity),
  }));
}
