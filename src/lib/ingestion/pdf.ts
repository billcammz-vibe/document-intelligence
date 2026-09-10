import "server-only";
import { extractText, getDocumentProxy } from "unpdf";

export interface ParsedPage {
  page: number; // 1-indexed
  content: string;
}

export interface ParsedPdf {
  pageCount: number;
  pages: ParsedPage[];
}

/** Collapse runs of whitespace, keep paragraph breaks. */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

/**
 * Extract text one page at a time so every downstream chunk carries an exact
 * page number. Runs on the Node runtime (unpdf bundles a serverless pd.js).
 */
export async function parsePdf(data: Uint8Array): Promise<ParsedPdf> {
  const pdf = await getDocumentProxy(data);
  const { totalPages, text } = await extractText(pdf, { mergePages: false });

  const pages: ParsedPage[] = text.map((raw, i) => ({
    page: i + 1,
    content: normalizeWhitespace(raw ?? ""),
  }));

  return { pageCount: totalPages, pages };
}
