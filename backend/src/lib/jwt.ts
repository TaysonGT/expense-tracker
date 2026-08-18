import jwt from "jsonwebtoken";
import type { GroupRole } from "../entities/GroupMembership";

/**
 * JWT session token utilities.
 *
 * The session token is the app's source of truth for identity + the currently
 * active group. It is delivered as an httpOnly cookie (see session.ts) so the
 * browser never touches the raw token.
 *
 * Payload shape:
 *  - userId, email        — always present after login
 *  - activeGroupId, role  — present only after a group has been selected
 */

export interface SessionPayload {
  userId: string;
  email: string;
  activeGroupId?: string;
  activeRole?: GroupRole;
}

const DEV_FALLBACK_SECRET = "dev-insecure-secret-change-me";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim()) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production");
  }
  // Dev-only fallback so the app runs without extra setup.
  return DEV_FALLBACK_SECRET;
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: TOKEN_TTL_SECONDS });
}

/** Verify + decode a session token. Returns null if invalid/expired. */
export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as jwt.JwtPayload;
    if (typeof decoded.userId !== "string" || typeof decoded.email !== "string") {
      return null;
    }
    return {
      userId: decoded.userId,
      email: decoded.email,
      activeGroupId:
        typeof decoded.activeGroupId === "string"
          ? decoded.activeGroupId
          : undefined,
      activeRole:
        decoded.activeRole === "admin" || decoded.activeRole === "viewer"
          ? decoded.activeRole
          : undefined,
    };
  } catch {
    return null;
  }
}

export const SESSION_TTL_SECONDS = TOKEN_TTL_SECONDS;
