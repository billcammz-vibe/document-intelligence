import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

/** Streams the stored PDF bytes so react-pdf can render the real pages. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const rows = await query<{ data: Buffer; name: string }>(
      `select f.data, d.name
       from document_files f
       join documents d on d.id = f.document_id
       where f.document_id = $1`,
      [id],
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    const { data, name } = rows[0];
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${encodeURIComponent(name)}"`,
        "cache-control": "private, max-age=3600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load file.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
