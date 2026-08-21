import type { Request, Response, NextFunction } from "express";
import { verifySession, type SessionPayload } from "../lib/jwt";
import { readSessionToken } from "../lib/session";
import { getMembership } from "../lib/groups";
import type { GroupRole } from "../entities/GroupMembership";

/**
 * Auth + tenant guards.
 *
 * - requireAuth: valid session required; attaches req.session.
 * - requireActiveGroup: session must have an active group selected.
 * - requireGroupMembership: for /groups/:groupId/* — the authenticated user
 *   must be a member of :groupId, else 403. Attaches the resolved role.
 */

// Augment Express Request with our resolved auth context.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: SessionPayload;
      groupRole?: GroupRole;
    }
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = readSessionToken(req);
  const payload = token ? verifySession(token) : null;
  if (!payload) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  req.session = payload;
  next();
}

export function requireActiveGroup(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.session) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  if (!req.session.activeGroupId) {
    res.status(409).json({ message: "No active group selected" });
    return;
  }
  next();
}

/**
 * Verify the authenticated user is a member of the group named in the route
 * param (`:groupId`). Attaches the membership role to req for downstream role
 * checks. 403 when not a member.
 */
export async function requireGroupMembership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.session) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    const groupId = String(req.params.groupId);
    if (!groupId) {
      res.status(400).json({ message: "groupId is required" });
      return;
    }
    const membership = await getMembership(req.session.userId, groupId);
    if (!membership) {
      res.status(403).json({ message: "Not a member of this group" });
      return;
    }
    req.groupRole = membership.role;
    next();
  } catch (err) {
    console.error("membership check error:", err);
    res.status(500).json({ message: "Failed to verify membership" });
  }
}

/** Require the resolved group role to be admin (use after requireGroupMembership). */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.groupRole !== "admin") {
    res.status(403).json({ message: "Admin role required" });
    return;
  }
  next();
}

/**
 * Require the resolved group role to be one of the allowed roles.
 * Must be used after requireGroupMembership (which sets req.groupRole).
 */
export function requireRole(...allowedRoles: GroupRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.groupRole || !allowedRoles.includes(req.groupRole)) {
      res.status(403).json({ message: "Insufficient permissions" });
      return;
    }
    next();
  };
}

/**
 * Resolve the effective tenant context for data routes: the active group from
 * the session plus the acting user. Data routes previously used getDevContext;
 * they now use this. Returns null (and the caller 401/409s) when unavailable.
 */
export function getRequestContext(
  req: Request
): { userId: string; groupId: string } | null {
  if (!req.session || !req.session.activeGroupId) return null;
  return { userId: req.session.userId, groupId: req.session.activeGroupId };
}
