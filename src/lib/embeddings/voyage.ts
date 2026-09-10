import "server-only";
import { env } from "@/lib/env";
import { type EmbeddingKind } from "@/lib/embeddings/index";

const ENDPOINT = "https://api.voyageai.com/v1/embeddings";

// Voyage's hard request ceiling is 1000 inputs / 120K tokens. We stay well
// under both so a single oversized batch can't permanently 429 on the free
// tier (3 RPM / 10K TPM until a payment method is added — free tokens still
// apply after that).
const MAX_ITEMS_PER_BATCH = 96;
const MAX_EST_TOKENS_PER_BATCH = 9000;
const MAX_RETRIES = 5;

interface VoyageResponse {
  data: { embedding: number[]; index: number }[];
}

const estTokens = (s: string) => Math.ceil(s.length / 4);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Group inputs so each request stays under the item and token budgets. */
function planBatches(texts: string[]): string[][] {
  const batches: string[][] = [];
  let current: string[] = [];
  let tokens = 0;
  for (const text of texts) {
    const t = estTokens(text);
    if (
      current.length > 0 &&
      (current.length >= MAX_ITEMS_PER_BATCH ||
        tokens + t > MAX_EST_TOKENS_PER_BATCH)
    ) {
      batches.push(current);
      current = [];
      tokens = 0;
    }
    current.push(text);
    tokens += t;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

async function embedBatch(batch: string[], kind: EmbeddingKind): Promise<number[][]> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.EMBEDDING_MODEL,
        input: batch,
        input_type: kind, // "document" | "query" — improves retrieval quality
        output_dimension: env.EMBEDDING_DIMENSIONS,
      }),
    });

    if (res.ok) {
      const json = (await res.json()) as VoyageResponse;
      return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    }

    // Rate limited — back off and retry. On the free tier (10K TPM) this is
    // expected between batches; it just makes ingestion slower.
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 30_000 * (attempt + 1);
      await sleep(waitMs);
      continue;
    }

    const body = await res.text();
    throw new Error(`Voyage embeddings failed (${res.status}): ${body.slice(0, 400)}`);
  }
}

export async function embedWithVoyage(
  texts: string[],
  kind: EmbeddingKind,
): Promise<number[][]> {
  if (!env.VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY is not set (EMBEDDING_PROVIDER="voyage").');
  }
  if (texts.length === 0) return [];

  const batches = planBatches(texts);
  const vectors: number[][] = [];
  for (let i = 0; i < batches.length; i++) {
    if (i > 0) await sleep(1000); // gentle spacing between batches
    vectors.push(...(await embedBatch(batches[i], kind)));
  }
  return vectors;
}
