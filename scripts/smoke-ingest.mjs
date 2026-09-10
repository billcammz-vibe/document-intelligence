// Exercises the pure ingestion pipeline (parse + chunk) without a DB or API keys.
//   node scripts/smoke-ingest.mjs sample-docs/berkshire-2023-shareholder-letter.pdf
import { readFileSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";

const path = process.argv[2];
if (!path) {
  console.error("usage: node scripts/smoke-ingest.mjs <file.pdf>");
  process.exit(1);
}

const bytes = new Uint8Array(readFileSync(path));
const pdf = await getDocumentProxy(bytes);
const { totalPages, text } = await extractText(pdf, { mergePages: false });

console.log(`pages: ${totalPages}`);
console.log(`page 1 chars: ${text[0]?.length ?? 0}`);
console.log(`page 1 preview:\n${(text[0] ?? "").slice(0, 300)}\n---`);

const totalChars = text.reduce((n, t) => n + (t?.length ?? 0), 0);
console.log(`total extracted chars: ${totalChars}`);
