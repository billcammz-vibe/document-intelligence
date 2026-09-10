import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env, requireAnthropicKey } from "@/lib/env";

const globalForAnthropic = globalThis as unknown as { __anthropic?: Anthropic };

export function getAnthropic(): Anthropic {
  if (!globalForAnthropic.__anthropic) {
    globalForAnthropic.__anthropic = new Anthropic({ apiKey: requireAnthropicKey() });
  }
  return globalForAnthropic.__anthropic;
}

export const MODEL = env.ANTHROPIC_MODEL;
