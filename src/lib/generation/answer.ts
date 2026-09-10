import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, MODEL } from "@/lib/anthropic";
import { SYSTEM_PROMPT } from "@/lib/generation/prompt";
import type { Citation, QueryResult, RetrievedChunk } from "@/types";

const NOT_FOUND_RE = /^\s*i (?:could not|couldn't|can(?:'|no)?t) find\b/i;

/**
 * Pass each retrieved chunk to Claude as its own `document` block with the
 * native Citations API enabled, then map every returned citation back to our
 * source metadata (document name + page). Claude can only cite text we supplied,
 * so citation markers cannot be hallucinated.
 */
export async function generateAnswer(
  question: string,
  retrieved: RetrievedChunk[],
): Promise<QueryResult> {
  if (retrieved.length === 0) {
    return {
      answer:
        "I could not find the answer to that in the uploaded documents.",
      citations: [],
      retrieved: [],
      answered: false,
    };
  }

  const client = getAnthropic();

  const documentBlocks = retrieved.map((chunk, i) => ({
    type: "document" as const,
    source: {
      type: "content" as const,
      content: [{ type: "text" as const, text: chunk.content }],
    },
    title: `${chunk.documentName} (page ${chunk.page})`,
    context: `Source ${i + 1}: passage retrieved from "${chunk.documentName}", page ${chunk.page}.`,
    citations: { enabled: true },
  }));

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          ...documentBlocks,
          {
            type: "text",
            text: `Question: ${question}\n\nAnswer using only the sources above, and cite every factual claim.`,
          },
        ],
      },
    ] as unknown as Anthropic.MessageParam[],
  });

  if (message.stop_reason === "refusal") {
    return {
      answer: "The model declined to answer this request.",
      citations: [],
      retrieved,
      answered: false,
    };
  }

  const citations: Citation[] = [];
  const keyToMarker = new Map<string, number>();
  let answer = "";

  for (const block of message.content) {
    if (block.type !== "text") continue;
    answer += block.text;

    const markersHere: number[] = [];
    for (const c of block.citations ?? []) {
      const idx = (c as { document_index?: number }).document_index;
      const quote = (c as { cited_text?: string }).cited_text ?? "";
      if (idx === undefined || idx < 0 || idx >= retrieved.length) continue;

      const src = retrieved[idx];
      const key = `${idx}::${quote}`;
      let marker = keyToMarker.get(key);
      if (marker === undefined) {
        marker = citations.length + 1;
        keyToMarker.set(key, marker);
        citations.push({
          marker,
          documentId: src.documentId,
          documentName: src.documentName,
          page: src.page,
          chunkId: src.chunkId,
          quote,
          context: src.content,
        });
      }
      if (!markersHere.includes(marker)) markersHere.push(marker);
    }

    if (markersHere.length > 0) {
      answer += ` ${markersHere.map((m) => `[${m}]`).join("")}`;
    }
  }

  answer = answer.trim();
  const answered = citations.length > 0 && !NOT_FOUND_RE.test(answer);

  return { answer, citations, retrieved, answered };
}
