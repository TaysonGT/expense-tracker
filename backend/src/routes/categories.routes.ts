import { Router, Request, Response } from "express";

const router = Router();

/**
 * CRUD /categories — add / edit / delete categories.
 */

// GET /categories — list all categories for the user.
router.get("/", (_req: Request, res: Response) => {
  res.status(501).json({ message: "Not implemented: list categories" });
});

// POST /categories — create a category.
router.post("/", (_req: Request, res: Response) => {
  res.status(501).json({ message: "Not implemented: create category" });
});

// PATCH /categories/:id — edit a category.
router.patch("/:id", (_req: Request, res: Response) => {
  res.status(501).json({ message: "Not implemented: update category" });
});

// DELETE /categories/:id — delete a category.
router.delete("/:id", (_req: Request, res: Response) => {
  res.status(501).json({ message: "Not implemented: delete category" });
});

export default router;
