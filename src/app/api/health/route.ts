import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight readiness check so the UI can tell the user what to configure. */
export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  let database = false;
  if (databaseUrl) {
    try {
      const { Client } = await import("pg");
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      await client.query("select 1");
      await client.end();
      database = true;
    } catch {
      database = false;
    }
  }

  const provider = process.env.EMBEDDING_PROVIDER ?? "voyage";
  const embeddings =
    provider === "openai"
      ? Boolean(process.env.OPENAI_API_KEY)
      : Boolean(process.env.VOYAGE_API_KEY);

  return NextResponse.json({
    database,
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    embeddings,
    provider,
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
    embeddingModel: process.env.EMBEDDING_MODEL ?? "voyage-3.5",
  });
}
