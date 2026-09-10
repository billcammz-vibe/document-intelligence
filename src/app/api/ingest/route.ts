import { NextResponse } from "next/server";
import { ingestPdf } from "@/lib/ingestion/ingest";

// Ingestion (parse + embed) can take a while for large filings.
export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 32 * 1024 * 1024; // Anthropic's per-request PDF ceiling

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data." },
      { status: 400 },
    );
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json(
      { error: "No files provided (field name: 'files')." },
      { status: 400 },
    );
  }

  const results = [];
  for (const file of files) {
    if (file.type && file.type !== "application/pdf") {
      results.push({
        name: file.name,
        status: "error" as const,
        error: "Not a PDF.",
      });
      continue;
    }
    if (file.size > MAX_BYTES) {
      results.push({
        name: file.name,
        status: "error" as const,
        error: "File exceeds the 32 MB limit.",
      });
      continue;
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const summary = await ingestPdf({ name: file.name, bytes });
    results.push(summary);
  }

  return NextResponse.json({ documents: results });
}
