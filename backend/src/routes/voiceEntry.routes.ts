import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Category } from "../entities/Category";
import { Expense } from "../entities/Expense";
import { getDevUserId } from "../lib/devUser";
import { parseVoiceEntry } from "../lib/voiceParser";

const router = Router();

/**
 * POST /voice-entry
 * Body: { transcript: string, date?: string (yyyy-mm-dd) }
 *
 * Runs LLM parsing + category-matching against the user's categories, then
 * creates one pending expense per parsed item. An item is pending when its
 * cost is missing OR its category is missing/uncertain (per spec). Since these
 * come from voice and need review, they are all created pending.
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { transcript, date } = req.body ?? {};
    if (typeof transcript !== "string" || !transcript.trim()) {
      return res.status(400).json({ message: "transcript is required" });
    }

    const userId = await getDevUserId();
    const categoryRepo = AppDataSource.getRepository(Category);
    const expenseRepo = AppDataSource.getRepository(Expense);

    const categories = await categoryRepo.find({ where: { userId } });

    const parsed = await parseVoiceEntry(
      transcript,
      categories.map((c) => ({ id: c.id, name: c.name }))
    );

    if (parsed.length === 0) {
      return res.status(422).json({
        message: "Could not extract any items from the transcript",
      });
    }

    const expenseDate = typeof date === "string" ? date : todayIso();

    const toSave = parsed.map((item) =>
      expenseRepo.create({
        userId,
        categoryId: item.categoryId,
        title: item.title,
        cost: item.cost != null ? item.cost.toFixed(2) : null,
        // Pending if cost missing OR category missing/uncertain.
        pending:
          item.cost == null ||
          item.categoryId == null ||
          item.categoryUncertain,
        source: "voice",
        originalTranscript: transcript,
        date: expenseDate,
      })
    );

    const saved = await expenseRepo.save(toSave);
    return res.status(201).json(saved);
  } catch (err) {
    console.error("voice-entry error:", err);
    return res
      .status(502)
      .json({ message: "Failed to process voice entry", detail: String(err) });
  }
});

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default router;
