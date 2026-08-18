import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Category } from "../entities/Category";
import { getDevContext } from "../lib/devUser";

const router = Router();

/**
 * CRUD /categories — add / edit / delete categories.
 */

// GET /categories — list all categories for the user.
router.get("/", async (_req: Request, res: Response) => {
  try {
    const { groupId } = await getDevContext();
    const categories = await AppDataSource.getRepository(Category).find({
      where: { groupId },
      order: { name: "ASC" },
    });
    return res.json(categories);
  } catch (err) {
    console.error("list categories error:", err);
    return res.status(500).json({ message: "Failed to list categories" });
  }
});

// POST /categories — create a category.
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name } = req.body ?? {};
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "name is required" });
    }
    const { groupId } = await getDevContext();
    const repo = AppDataSource.getRepository(Category);
    const category = repo.create({
      groupId,
      name: name.trim(),
      isBase: false,
    });
    const saved = await repo.save(category);
    return res.status(201).json(saved);
  } catch (err) {
    console.error("create category error:", err);
    return res.status(500).json({ message: "Failed to create category" });
  }
});

// PATCH /categories/:id — edit a category.
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { groupId } = await getDevContext();
    const id = String(req.params.id);
    const { name } = req.body ?? {};
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "name is required" });
    }
    const repo = AppDataSource.getRepository(Category);
    const category = await repo.findOne({ where: { id, groupId } });
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    category.name = name.trim();
    const saved = await repo.save(category);
    return res.json(saved);
  } catch (err) {
    console.error("update category error:", err);
    return res.status(500).json({ message: "Failed to update category" });
  }
});

// DELETE /categories/:id — delete a category.
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { groupId } = await getDevContext();
    const id = String(req.params.id);
    const repo = AppDataSource.getRepository(Category);
    const result = await repo.delete({ id, groupId });
    if (result.affected === 0) {
      return res.status(404).json({ message: "Category not found" });
    }
    return res.status(204).send();
  } catch (err) {
    console.error("delete category error:", err);
    return res.status(500).json({ message: "Failed to delete category" });
  }
});

export default router;
