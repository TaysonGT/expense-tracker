import { GoogleGenAI, Type } from "@google/genai";

/**
 * Gemini-backed transcript parser + category matcher.
 *
 * Given a raw voice transcript and the user's existing categories, the LLM:
 *  - splits multi-item sentences into separate {title, cost} entities
 *  - leaves cost null when it wasn't spoken
 *  - matches each item against the user's OWN categories (never invents one),
 *    returning categoryId = null + categoryUncertain = true when unsure.
 *
 * Uses structured JSON output via responseSchema so the result is reliable.
 */

export interface CategoryOption {
  id: string;
  name: string;
}

export interface ParsedEntity {
  title: string;
  cost: number | null;
  categoryId: string | null;
  categoryUncertain: boolean;
}

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: "Short name of the purchased item",
          },
          cost: {
            type: Type.NUMBER,
            nullable: true,
            description: "Numeric cost if spoken, otherwise null",
          },
          categoryId: {
            type: Type.STRING,
            nullable: true,
            description:
              "The id of the best-matching category from the provided list, or null if no confident match",
          },
          categoryUncertain: {
            type: Type.BOOLEAN,
            description:
              "true when the category match is a guess or no good match exists",
          },
        },
        required: ["title", "cost", "categoryId", "categoryUncertain"],
      },
    },
  },
  required: ["items"],
};

function buildPrompt(transcript: string, categories: CategoryOption[]): string {
  const categoryList = categories
    .map((c) => `- ${c.name} (id: ${c.id})`)
    .join("\n");

  return [
    "You extract expense line-items from a spoken transcript.",
    "",
    "Rules:",
    "- Split multi-item sentences into separate items.",
    "- Each item has a short title (e.g. 'lemons', 'milk').",
    "- If a cost is spoken for an item, set cost to that number; otherwise null.",
    "- A single cost may apply to multiple grouped items only if clearly stated; otherwise leave cost null.",
    "- Match each item to ONE category from the list below using its id.",
    "- If no category is a confident match, set categoryId to null and categoryUncertain to true.",
    "- Never invent a category id that is not in the list.",
    "",
    "User's categories:",
    categoryList || "(none)",
    "",
    `Transcript: "${transcript}"`,
  ].join("\n");
}

export async function parseTranscript(
  transcript: string,
  categories: CategoryOption[]
): Promise<ParsedEntity[]> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildPrompt(transcript, categories),
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  let parsed: { items?: unknown };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Failed to parse Gemini JSON response");
  }

  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const validIds = new Set(categories.map((c) => c.id));

  return items.map((raw): ParsedEntity => {
    const item = raw as Record<string, unknown>;
    const title =
      typeof item.title === "string" && item.title.trim()
        ? item.title.trim()
        : "Untitled";

    const cost =
      typeof item.cost === "number" && !Number.isNaN(item.cost)
        ? item.cost
        : null;

    // Guard against hallucinated category ids.
    const rawCategoryId =
      typeof item.categoryId === "string" ? item.categoryId : null;
    const categoryId =
      rawCategoryId && validIds.has(rawCategoryId) ? rawCategoryId : null;

    const categoryUncertain =
      categoryId == null || item.categoryUncertain === true;

    return { title, cost, categoryId, categoryUncertain };
  });
}
