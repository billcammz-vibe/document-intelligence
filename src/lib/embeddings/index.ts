import "server-only";
import { env } from "@/lib/env";
import { embedWithVoyage } from "@/lib/embeddings/voyage";
import { embedWithOpenAI } from "@/lib/embeddings/openai";

export type EmbeddingKind = "document" | "query";

export interface EmbeddingProvider {
  readonly name: string;
  readonly model: string;
  readonly dimensions: number;
  /** Returns one vector per input string, in the same order. */
  embed(texts: string[], kind: EmbeddingKind): Promise<number[][]>;
}

export function getEmbeddingProvider(): EmbeddingProvider {
  const shared = { model: env.EMBEDDING_MODEL, dimensions: env.EMBEDDING_DIMENSIONS };
  switch (env.EMBEDDING_PROVIDER) {
    case "openai":
      return { name: "openai", ...shared, embed: embedWithOpenAI };
    case "voyage":
    default:
      return { name: "voyage", ...shared, embed: embedWithVoyage };
  }
}

/** Split a list into fixed-size batches. */
export function batched<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
