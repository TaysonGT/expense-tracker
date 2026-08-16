import OpenAI from "openai";
import type { CategoryOption, ParsedEntity } from "./gemini";

/**
 * Groq-backed transcript parser + category matcher.
 *
 * Same input/output contract as the Gemini parser (parseTranscript), so the
 * dispatcher can swap between them transparently.
 *
 * Groq exposes an OpenAI-compatible API. It does not enforce a JSON schema the
 * way Gemini's responseSchema does, so we:
 *  - use response_format: { type: "json_object" }
 *  - spell out the exact expected shape in the prompt with a worked example
 *  - validate the parsed JSON in code (array shape, field types) and discard
 *    any categoryId that isn't one of the user's real category ids.
 */

const BASE_URL = "https://api.groq.com/openai/v1";
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }
  if (!client) {
    client = new OpenAI({ apiKey, baseURL: BASE_URL });
  }
  return client;
}

function buildPrompt(transcript: string, categories: CategoryOption[]): string {
  const categoryList = categories
    .map((c) => `- ${c.name} (id: ${c.id})`)
    .join("\n");

  return [
    "You extract expense line-items from a spoken transcript.",
    "",
    "Return a JSON object with a single key \"items\" whose value is an ARRAY of",
    "objects. Each object MUST have exactly these fields:",
    '  - "title": string — a short name of the purchased item (e.g. "lemons").',
    '  - "cost": number or null — the spoken cost, or null if none was spoken.',
    '  - "categoryId": string or null — the id of the best-matching category',
    "      from the list below, or null if no confident match exists.",
    '  - "categoryUncertain": boolean — true when the category is a guess or no',
    "      good match exists, false only when you are confident.",
    "",
    "Rules:",
    "- Split multi-item sentences into separate items.",
    "- If a cost is spoken for an item, set cost to that number; otherwise null.",
    "- A single cost applies to multiple items only if clearly stated; otherwise null.",
    "- Match each item to ONE category using its id. Never invent an id that is",
    "  not in the list. If unsure, use null and set categoryUncertain to true.",
    "",
    "Worked example:",
    'User categories: "- Groceries (id: cat_1)\\n- Transport (id: cat_2)"',
    'Transcript: "lemons and potatoes for $1.50, uh, a taxi ride"',
    "Expected output:",
    JSON.stringify(
      {
        items: [
          {
            title: "lemons",
            cost: null,
            categoryId: "cat_1",
            categoryUncertain: false,
          },
          {
            title: "potatoes",
            cost: 1.5,
            categoryId: "cat_1",
            categoryUncertain: false,
          },
          {
            title: "taxi ride",
            cost: null,
            categoryId: "cat_2",
            categoryUncertain: false,
          },
        ],
      },
      null,
      2
    ),
    "",
    "User's categories:",
    categoryList || "(none)",
    "",
    `Transcript: "${transcript}"`,
  ].join("\n");
}

export async function parseTranscriptGroq(
  transcript: string,
  categories: CategoryOption[]
): Promise<ParsedEntity[]> {
  const ai = getClient();

  const completion = await ai.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a precise information extraction engine. Respond with valid JSON only.",
      },
      { role: "user", content: buildPrompt(transcript, categories) },
    ],
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) {
    throw new Error("Empty response from Groq");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Failed to parse Groq JSON response");
  }

  // Accept either { items: [...] } or a bare array, for resilience.
  const rawItems = extractItems(parsed);
  const validIds = new Set(categories.map((c) => c.id));

  return rawItems.map((raw): ParsedEntity => {
    const item = (raw ?? {}) as Record<string, unknown>;

    const title =
      typeof item.title === "string" && item.title.trim()
        ? item.title.trim()
        : "Untitled";

    const cost =
      typeof item.cost === "number" && !Number.isNaN(item.cost)
        ? item.cost
        : null;

    // Discard hallucinated / non-string category ids.
    const rawCategoryId =
      typeof item.categoryId === "string" ? item.categoryId : null;
    const categoryId =
      rawCategoryId && validIds.has(rawCategoryId) ? rawCategoryId : null;

    const categoryUncertain =
      categoryId == null || item.categoryUncertain === true;

    return { title, cost, categoryId, categoryUncertain };
  });
}

function extractItems(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const items = (parsed as Record<string, unknown>).items;
    if (Array.isArray(items)) return items;
  }
  return [];
}
