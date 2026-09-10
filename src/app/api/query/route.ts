import { NextResponse } from "next/server";
import { z } from "zod";
import { retrieve } from "@/lib/retrieval/search";
import { generateAnswer } from "@/lib/generation/answer";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  question: z.string().min(3).max(2000),
  documentIds: z.array(z.string().uuid()).optional(),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (err) {
    const message =
      err instanceof z.ZodError ? err.issues[0]?.message : "Invalid request body.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const retrieved = await retrieve(parsed.question, {
      documentIds: parsed.documentIds,
    });
    const result = await generateAnswer(parsed.question, retrieved);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Query failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
