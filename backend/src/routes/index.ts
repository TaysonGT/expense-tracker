import { Router } from "express";
import voiceEntryRoutes from "./voiceEntry.routes";
import expensesRoutes from "./expenses.routes";
import categoriesRoutes from "./categories.routes";

const router = Router();

router.use("/voice-entry", voiceEntryRoutes);
router.use("/expenses", expensesRoutes);
router.use("/categories", categoriesRoutes);

export default router;
