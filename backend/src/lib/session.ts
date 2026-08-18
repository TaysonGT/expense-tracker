import type { Request, Response } from "express";
import {
  signSession,
  SESSION_TTL_SECONDS,
  type SessionPayload,
} from "./jwt";

/**
 * Session cookie helpers.
 *
 * The signed JWT session lives in an httpOnly cookie so it's inaccessible to
 * client JS (mitigating XSS token theft). In production the cookie is Secure +
 * SameSite=None (cross-site: frontend and API on different domains); in dev
 * it's Lax over http.
 */

export const SESSION_COOKIE = "session";

function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ("none" as const) : ("lax" as const),
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: "/",
  };
}

/** Sign the payload and attach it as the session cookie. */
export function setSessionCookie(res: Response, payload: SessionPayload): string {
  const token = signSession(payload);
  res.cookie(SESSION_COOKIE, token, cookieOptions());
  return token;
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined });
}

/** Read the raw session token from the request cookies (or Bearer header). */
export function readSessionToken(req: Request): string | null {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  if (cookies && typeof cookies[SESSION_COOKIE] === "string") {
    return cookies[SESSION_COOKIE];
  }
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length).trim();
  }
  return null;
}
