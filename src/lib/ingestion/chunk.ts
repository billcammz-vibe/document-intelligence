import "server-only";
import type { ParsedPage } from "@/lib/ingestion/pdf";

export interface TextChunk {
  page: number;
  chunkIndex: number; // global order within the document
  content: string;
}

export interface ChunkOptions {
  size: number; // target characters per chunk
  overlap: number; // characters carried from the tail of the previous chunk
}

// Progressively finer split points. We break on the coarsest boundary that
// keeps pieces under `size`, falling back to a hard character cut.
const SEPARATORS = ["\n\n", "\n", ". ", "; ", " "];

function splitRecursive(text: string, size: number, seps: string[]): string[] {
  if (text.length <= size) return text.trim() ? [text] : [];

  const [sep, ...rest] = seps;
  if (sep === undefined) {
    // No separators left — hard-cut.
    const out: string[] = [];
    for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
    return out;
  }

  const parts = text.split(sep);
  const pieces: string[] = [];
  let buf = "";

  for (const part of parts) {
    const candidate = buf ? buf + sep + part : part;
    if (candidate.length <= size) {
      buf = candidate;
      continue;
    }
    if (buf) pieces.push(buf);
    if (part.length > size) {
      pieces.push(...splitRecursive(part, size, rest));
      buf = "";
    } else {
      buf = part;
    }
  }
  if (buf.trim()) pieces.push(buf);
  return pieces;
}

/** Merge small pieces up to `size` and add a trailing-character overlap. */
function packWithOverlap(pieces: string[], opts: ChunkOptions): string[] {
  const merged: string[] = [];
  let buf = "";
  for (const piece of pieces) {
    const candidate = buf ? `${buf} ${piece}`.trim() : piece.trim();
    if (candidate.length <= opts.size || !buf) {
      buf = candidate;
    } else {
      merged.push(buf);
      const tail = buf.slice(Math.max(0, buf.length - opts.overlap));
      buf = `${tail} ${piece}`.trim();
    }
  }
  if (buf.trim()) merged.push(buf);
  return merged;
}

/**
 * Chunk each page independently. Because a chunk never spans a page break, its
 * page number is exact — the trade-off is that a sentence split across pages is
 * divided, which is acceptable for filings and contracts.
 */
export function chunkPages(pages: ParsedPage[], opts: ChunkOptions): TextChunk[] {
  const chunks: TextChunk[] = [];
  let chunkIndex = 0;

  for (const { page, content } of pages) {
    if (!content.trim()) continue;
    const pieces = splitRecursive(content, opts.size, SEPARATORS);
    for (const text of packWithOverlap(pieces, opts)) {
      const trimmed = text.trim();
      if (trimmed.length < 20) continue; // drop page numbers / stray fragments
      chunks.push({ page, chunkIndex: chunkIndex++, content: trimmed });
    }
  }

  return chunks;
}
