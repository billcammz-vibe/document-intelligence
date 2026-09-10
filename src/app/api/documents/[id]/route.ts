import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const rows = await query(
      `delete from documents where id = $1 returning id`,
      [id],
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
