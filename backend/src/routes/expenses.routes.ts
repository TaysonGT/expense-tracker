import { Router, Request, Response } from "express";
import { Between, LessThanOrEqual, MoreThanOrEqual } from "typeorm";
import { AppDataSource } from "../data-source";
import { Expense } from "../entities/Expense";
import { GroupRole } from "../entities/GroupMembership";
import { requireAuth, requireActiveGroup, getRequestContext, requireGroupMembership, requireRole } from "../middleware/auth";

const router = Router();

// Every expense route requires a logged-in user with an active group.
router.use(requireAuth, requireActiveGroup);

/**
 * GET /expenses
 * Full list of expenses, filterable by date range and category.
 * Query params: startDate, endDate (yyyy-mm-dd), categoryId, pending ("true"|"false").
 * Ordered newest first.
 * All roles can read.
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { groupId } = getRequestContext(req)!;
    const { startDate, endDate, categoryId, pending } = req.query;

    const where: Record<string, unknown> = { groupId };

    if (typeof categoryId === "string" && categoryId) {
      where.categoryId = categoryId;
    }

    if (typeof pending === "string") {
      if (pending === "true") where.pending = true;
      else if (pending === "false") where.pending = false;
    }

    // Date range filter on the `date` column.
    const start = typeof startDate === "string" ? startDate : undefined;
    const end = typeof endDate === "string" ? endDate : undefined;
    if (start && end) {
      where.date = Between(start, end);
    } else if (start) {
      where.date = MoreThanOrEqual(start);
    } else if (end) {
      where.date = LessThanOrEqual(end);
    }

    const expenses = await AppDataSource.getRepository(Expense).find({
      where,
      order: { date: "DESC", createdAt: "DESC" },
      relations: { category: true, creator: true },
    });

    return res.json(expenses);
  } catch (err) {
    console.error("list expenses error:", err);
    return res.status(500).json({ message: "Failed to list expenses" });
  }
});

/**
 * GET /expenses/pending
 * Powers the approval queue — returns expenses where pending = true.
 * All roles can read.
 */
router.get("/pending", async (req: Request, res: Response) => {
  try {
    const { groupId } = getRequestContext(req)!;
    const expenses = await AppDataSource.getRepository(Expense).find({
      where: { groupId, pending: true },
      order: { createdAt: "DESC" },
      relations: { category: true },
    });
    return res.json(expenses);
  } catch (err) {
    console.error("list pending error:", err);
    return res.status(500).json({ message: "Failed to list pending expenses" });
  }
});

/**
 * POST /expenses
 * Manual add. Body: { title, cost, categoryId, date? }
 * The user has confirmed everything, so the expense is NOT pending and skips
 * the approval flow.
 * Requires read_write or admin role.
 */
router.post("/",
  requireGroupMembership,
  requireRole("admin", "read_write"),
  async (req: Request, res: Response) => {
    try {
      const { title, cost, categoryId, date } = req.body ?? {};

      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ message: "title is required" });
      }
      const costNum = typeof cost === "number" ? cost : Number(cost);
      if (Number.isNaN(costNum) || costNum < 0) {
        return res.status(400).json({ message: "a valid cost is required" });
      }
      if (typeof categoryId !== "string" || !categoryId) {
        return res.status(400).json({ message: "categoryId is required" });
      }

      const ctx = getRequestContext(req)!;
      const { groupId, userId } = ctx;
      const expenseRepo = AppDataSource.getRepository(Expense);

      const expense = expenseRepo.create({
        groupId,
        createdBy: userId,
        categoryId,
        title: title.trim(),
        cost: costNum.toFixed(2),
        pending: false, // user-confirmed → no approval needed
        source: "manual",
        originalTranscript: null,
        date: typeof date === "string" ? date : todayIso(),
      });

      const saved = await expenseRepo.save(expense);
      return res.status(201).json(saved);
    } catch (err) {
      console.error("create expense error:", err);
      return res.status(500).json({ message: "Failed to create expense" });
    }
  });

/**
 * GET /expenses/pending
 * Powers the approval queue — returns expenses where pending = true.
 */
router.get("/pending", async (req: Request, res: Response) => {
  try {
    const { groupId } = getRequestContext(req)!;
    const expenses = await AppDataSource.getRepository(Expense).find({
      where: { groupId, pending: true },
      order: { createdAt: "DESC" },
      relations: { category: true, creator: true },
    });
    return res.json(expenses);
  } catch (err) {
    console.error("list pending error:", err);
    return res.status(500).json({ message: "Failed to list pending expenses" });
  }
});

/**
 * PATCH /expenses/:id
 * General field update for an existing expense (title, cost, categoryId,
 * date). Unlike /approve, this does not change the pending flag — it's for
 * arbitrary edits to already-listed expenses from the Expenses page.
 * Body: { title?, cost?, categoryId?, date? }
 * read_write and admin can edit. Users can only edit their own expenses unless admin.
 */
router.patch("/:id",
  requireGroupMembership,
  requireRole("admin", "read_write"),
  async (req: Request, res: Response) => {
    try {
      const { groupId, userId } = getRequestContext(req)!;
      const id = String(req.params.id);
      const expenseRepo = AppDataSource.getRepository(Expense);

      const expense = await expenseRepo.findOne({ where: { id, groupId } });
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      // Check if user can edit this expense
      const isOwner = expense.createdBy === userId;
      const isAdmin = req.groupRole === "admin";
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: "Can only edit your own expenses" });
      }

      const { title, cost, categoryId, date } = req.body ?? {};

      if (title !== undefined) {
        if (typeof title !== "string" || !title.trim()) {
          return res.status(400).json({ message: "invalid title" });
        }
        expense.title = title.trim();
      }

      if (cost !== undefined) {
        // Allow explicit null to clear the cost (item becomes cost-pending).
        if (cost === null) {
          expense.cost = null;
        } else {
          const costNum = typeof cost === "number" ? cost : Number(cost);
          if (Number.isNaN(costNum) || costNum < 0) {
            return res.status(400).json({ message: "invalid cost" });
          }
          expense.cost = costNum.toFixed(2);
        }
      }

      if (categoryId !== undefined) {
        // Allow explicit null to clear the category.
        if (categoryId === null) {
          expense.categoryId = null;
        } else if (typeof categoryId === "string" && categoryId) {
          expense.categoryId = categoryId;
        } else {
          return res.status(400).json({ message: "invalid categoryId" });
        }
      }

      if (date !== undefined) {
        if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return res.status(400).json({ message: "invalid date" });
        }
        expense.date = date;
      }

      const saved = await expenseRepo.save(expense);
      const withCategory = await expenseRepo.findOne({
        where: { id: saved.id },
        relations: { category: true, creator: true },
      });
      return res.json(withCategory ?? saved);
    } catch (err) {
      console.error("update expense error:", err);
      return res.status(500).json({ message: "Failed to update expense" });
    }
  });

/**
 * PATCH /expenses/:id/approve
 * Confirm/edit title, category, and cost, then flip pending to false.
 * Body: { title?, cost?, categoryId? }
 * Requires read_write or admin.
 */
router.patch("/:id/approve",
  requireGroupMembership,
  requireRole("admin", "read_write"),
  async (req: Request, res: Response) => {
    try {
      const { groupId } = getRequestContext(req)!;
      const id = String(req.params.id);
      const expenseRepo = AppDataSource.getRepository(Expense);

      const expense = await expenseRepo.findOne({ where: { id, groupId } });
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      const { title, cost, categoryId } = req.body ?? {};
      if (typeof title === "string" && title.trim()) {
        expense.title = title.trim();
      }
      if (cost !== undefined) {
        const costNum = typeof cost === "number" ? cost : Number(cost);
        if (Number.isNaN(costNum) || costNum < 0) {
          return res.status(400).json({ message: "invalid cost" });
        }
        expense.cost = costNum.toFixed(2);
      }
      if (typeof categoryId === "string" && categoryId) {
        expense.categoryId = categoryId;
      }

      // Cannot approve without a cost and category.
      if (expense.cost == null || expense.categoryId == null) {
        return res
          .status(400)
          .json({ message: "cost and category are required to approve" });
      }

      expense.pending = false;
      const saved = await expenseRepo.save(expense);
      const withCreator = await expenseRepo.findOne({
        where: { id: saved.id },
        relations: { category: true, creator: true },
      });
      return res.json(withCreator ?? saved);
    } catch (err) {
      console.error("approve expense error:", err);
      return res.status(500).json({ message: "Failed to approve expense" });
    }
  });

/**
 * DELETE /expenses/:id
 * Delete an expense.
 * admin can delete any expense. read_write can delete their own expenses.
 * readonly cannot delete.
 */
router.delete("/:id",
  requireGroupMembership,
  requireRole("admin", "read_write"),
  async (req: Request, res: Response) => {
    try {
      const { groupId, userId } = getRequestContext(req)!;
      const id = String(req.params.id);
      const expenseRepo = AppDataSource.getRepository(Expense);

      const expense = await expenseRepo.findOne({ where: { id, groupId } });
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      // Check if user can delete this expense
      const isOwner = expense.createdBy === userId;
      const isAdmin = req.groupRole === "admin";
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: "Can only delete your own expenses" });
      }

      await expenseRepo.remove(expense);
      return res.status(204).send();
    } catch (err) {
      console.error("delete expense error:", err);
      return res.status(500).json({ message: "Failed to delete expense" });
    }
  });

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default router;