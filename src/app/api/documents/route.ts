import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { rowToSummary } from "@/lib/ingestion/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await query(
      `select * from documents order by created_at desc`,
    );
    return NextResponse.json({ documents: rows.map((r) => rowToSummary(r as never)) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list documents.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
