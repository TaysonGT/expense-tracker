import "reflect-metadata";
import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { AppDataSource } from "./data-source";
import apiRoutes from "./routes";
import "pg";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Ensure DB is initialized before any route runs
let dbInitPromise: Promise<typeof AppDataSource> | null = null;

app.use(async (_req, res, next) => {
  try {
    if (!AppDataSource.isInitialized) {
      if (!dbInitPromise) {
        dbInitPromise = AppDataSource.initialize();
      }
      await dbInitPromise;
    }
    next();
  } catch (err) {
    console.error("DB initialization failed:", err);
    res.status(503).json({ error: "Database unavailable" });
  }
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// API routes (stubs)
app.use("/", apiRoutes);

// Keep for local dev — harmless no-op-ish on Vercel, but guard it so it
// doesn't fire a duplicate/conflicting initialize() call there
if (!process.env.VERCEL) {
  const PORT = parseInt(process.env.PORT || "4000", 10);
  AppDataSource.initialize()
    .then(() => {
      console.log("Data source initialized");
      app.listen(PORT, () => {
        console.log(`Server listening on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error("Error during data source initialization:", err);
      app.listen(PORT, () => {
        console.log(`Server listening on http://localhost:${PORT} (DB not connected)`);
      });
    });
}

export default app;
