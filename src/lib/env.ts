import "server-only";
import { z } from "zod";

/**
 * Environment is parsed leniently so the dev server and UI always boot. API
 * keys are optional here; the ingestion and query paths assert what they need
 * (see `requireApiKey`) and surface a clear error if it's missing.
 */
const schema = z.object({
  DATABASE_URL: z.string().optional(),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-5"),

  EMBEDDING_PROVIDER: z.enum(["voyage", "openai"]).default("voyage"),
  VOYAGE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  EMBEDDING_MODEL: z.string().default("voyage-3.5"),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1024),

  RETRIEVAL_TOP_K: z.coerce.number().int().positive().default(8),
  CHUNK_SIZE: z.coerce.number().int().positive().default(1000),
  CHUNK_OVERLAP: z.coerce.number().int().nonnegative().default(150),
});

export const env = schema.parse(process.env);

export function requireDatabaseUrl(): string {
  if (!env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and point it at a pgvector-capable Postgres.",
    );
  }
  return env.DATABASE_URL;
}

export function requireAnthropicKey(): string {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set — add it to .env.local.");
  }
  return env.ANTHROPIC_API_KEY;
}
