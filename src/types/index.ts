export type DocumentStatus = "processing" | "ready" | "error";

export interface DocumentSummary {
  id: string;
  name: string;
  pageCount: number;
  byteSize: number;
  status: DocumentStatus;
  error: string | null;
  createdAt: string;
}

/** A chunk returned from vector search, with its source metadata. */
export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  documentName: string;
  page: number;
  chunkIndex: number;
  content: string;
  similarity: number;
}

/** One grounded citation, mapped back from Claude's response to our source. */
export interface Citation {
  /** 1-based number rendered inline in the answer as [n]. */
  marker: number;
  documentId: string;
  documentName: string;
  page: number;
  chunkId: string;
  /** The exact span Claude cited. */
  quote: string;
  /** The full retrieved chunk the quote was drawn from. */
  context: string;
}

export interface QueryResult {
  /** Answer text as markdown, with [n] citation markers inline. */
  answer: string;
  citations: Citation[];
  /** Everything retrieval surfaced, for transparency in the UI. */
  retrieved: RetrievedChunk[];
  /** false when the model reported the answer is not in the documents. */
  answered: boolean;
}
