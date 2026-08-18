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

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// API routes (stubs)
app.use("/", apiRoutes);

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
    // Start the server anyway so route stubs are reachable without a DB.
    app.listen(PORT, () => {
      console.log(
        `Server listening on http://localhost:${PORT} (DB not connected)`
      );
    });
  });

export default app;
