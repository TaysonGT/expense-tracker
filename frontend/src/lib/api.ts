import axios from "axios";

/**
 * Shared axios instance. In dev, requests go to "/api/*" which Vite proxies to
 * the backend (see vite.config.ts). Override with VITE_API_BASE_URL if needed.
 *
 * `withCredentials` is on so the httpOnly session cookie is sent with every
 * request (cookie-based JWT session — see backend lib/session.ts).
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});
