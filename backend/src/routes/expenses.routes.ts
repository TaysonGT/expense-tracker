import { Router, Request, Response } from "express";

const router = Router();

/**
 * GET /expenses
 * Full list of expenses. Filterable by date range and category.
 * Query params (planned): startDate, endDate, categoryId.
 *
 * TODO: implement query with filters.
 */
router.get("/", (_req: Request, res: Response) => {
  res.status(501).json({ message: "Not implemented: list expenses" });
});

/**
 * POST /expenses
 * Manual add — creates a non-pending expense from the Manual Add form.
 * (Not in the spec's API list, but required by the Manual Add screen.)
 *
 * TODO: implement manual create.
 */
router.post("/", (_req: Request, res: Response) => {
  res.status(501).json({ message: "Not implemented: create expense (manual)" });
});

/**
 * GET /expenses/pending
 * Powers the approval queue — returns expenses where pending = true.
 *
 * TODO: implement pending query.
 */
router.get("/pending", (_req: Request, res: Response) => {
  res.status(501).json({ message: "Not implemented: list pending expenses" });
});

/**
 * PATCH /expenses/:id/approve
 * Confirm/edit title, category, and cost, then flip pending to false.
 *
 * TODO: implement approval + validation.
 */
router.patch("/:id/approve", (_req: Request, res: Response) => {
  res.status(501).json({ message: "Not implemented: approve expense" });
});

export default router;
