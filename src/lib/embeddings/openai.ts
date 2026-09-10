import "server-only";
import { env } from "@/lib/env";
import { batched, type EmbeddingKind } from "@/lib/embeddings/index";

const ENDPOINT = "https://api.openai.com/v1/embeddings";
const MAX_BATCH = 128;

interface OpenAIResponse {
  data: { embedding: number[]; index: number }[];
}

export async function embedWithOpenAI(
  texts: string[],
  _kind: EmbeddingKind, // OpenAI has no input-type distinction
): Promise<number[][]> {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set (EMBEDDING_PROVIDER="openai").');
  }
  if (texts.length === 0) return [];

  const vectors: number[][] = [];
  for (const batch of batched(texts, MAX_BATCH)) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.EMBEDDING_MODEL,
        input: batch,
        dimensions: env.EMBEDDING_DIMENSIONS,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI embeddings failed (${res.status}): ${body.slice(0, 500)}`);
    }

    const json = (await res.json()) as OpenAIResponse;
    json.data
      .sort((a, b) => a.index - b.index)
      .forEach((d) => vectors.push(d.embedding));
  }
  return vectors;
}
