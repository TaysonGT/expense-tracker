import type { CategoryOption, ParsedEntity } from "./gemini";
import { parseTranscript as parseWithGemini } from "./gemini";
import { parseTranscriptGroq as parseWithGroq } from "./groq";

/**
 * Single entry point for voice-entry LLM parsing.
 *
 * Provider selection is a stable, startup-time decision (not a per-request
 * scramble): if GROQ_API_KEY is set and non-empty, Groq is used; otherwise we
 * fall back to Gemini. Both paths return the exact same ParsedEntity[] shape,
 * so the /voice-entry route doesn't know or care which LLM actually ran.
 *
 * If the selected provider's API call fails at request time, the error
 * propagates unchanged — we do NOT silently switch providers mid-request.
 */

type Provider = "groq" | "gemini";

const provider: Provider = selectProvider();

function selectProvider(): Provider {
  const groqKey = process.env.GROQ_API_KEY;
  return groqKey && groqKey.trim() ? "groq" : "gemini";
}

let logged = false;
function logProviderOnce(): void {
  if (logged) return;
  logged = true;
  const model =
    provider === "groq"
      ? process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
      : process.env.GEMINI_MODEL || "gemini-3.5-flash";
  console.log(`Voice-entry LLM provider: ${provider} (model: ${model})`);
}

// Emit the active provider at module load (startup).
logProviderOnce();

export async function parseVoiceEntry(
  transcript: string,
  categories: CategoryOption[]
): Promise<ParsedEntity[]> {
  if (provider === "groq") {
    return parseWithGroq(transcript, categories);
  }
  return parseWithGemini(transcript, categories);
}
