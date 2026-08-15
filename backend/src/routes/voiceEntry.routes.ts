import { Router, Request, Response } from "express";

const router = Router();

/**
 * POST /voice-entry
 * Accepts a transcript, runs LLM parsing + category-matching, and creates
 * one or more pending expense records.
 *
 * TODO: implement transcript parsing (Gemini structured JSON) + category match.
 */
router.post("/", (_req: Request, res: Response) => {
  res.status(501).json({ message: "Not implemented: voice-entry parsing" });
});

export default router;
