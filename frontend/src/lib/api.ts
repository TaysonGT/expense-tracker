import axios from "axios";

/**
 * Shared axios instance. In dev, requests go to "/api/*" which Vite proxies to
 * the backend (see vite.config.ts). Override with VITE_API_BASE_URL if needed.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  headers: { "Content-Type": "application/json" },
});
