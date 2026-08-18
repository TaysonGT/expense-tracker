import { Router } from "express";
import authRoutes from "./auth.routes";
import groupsRoutes from "./groups.routes";
import voiceEntryRoutes from "./voiceEntry.routes";
import expensesRoutes from "./expenses.routes";
import categoriesRoutes from "./categories.routes";

const router = Router();

// Auth (unauthenticated: login/callback; /me and /logout self-guard).
router.use("/auth", authRoutes);

// Group onboarding + management (all require auth; membership-scoped inside).
router.use("/groups", groupsRoutes);

// Data routes — each router self-applies requireAuth + requireActiveGroup.
router.use("/voice-entry", voiceEntryRoutes);
router.use("/expenses", expensesRoutes);
router.use("/categories", categoriesRoutes);

export default router;
