import { Router, Request, Response } from "express";
import { verifyOAuthToken, type OAuthProvider } from "../lib/oauth";
import { findOrCreateUser } from "../lib/users";
import { setSessionCookie, clearSessionCookie } from "../lib/session";
import { requireAuth } from "../middleware/auth";
import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { getMembership } from "../lib/groups";

const router = Router();

/**
 * POST /auth/:provider/callback
 * Body: { token }  (Google ID token or Facebook access token)
 *
 * Flow: verify token → find_or_create user → issue session cookie (JWT).
 * The freshly-minted session has no active group yet; the client then goes
 * through group onboarding, which re-issues the session with the group set.
 */
router.post("/:provider/callback", async (req: Request, res: Response) => {
  try {
    const provider = String(req.params.provider) as OAuthProvider;
    if (provider !== "google" && provider !== "facebook") {
      return res.status(400).json({ message: "Unsupported provider" });
    }

    const { token } = req.body ?? {};
    if (typeof token !== "string" || !token) {
      return res.status(400).json({ message: "token is required" });
    }

    const profile = await verifyOAuthToken(provider, token);
    const user = await findOrCreateUser(profile);

    setSessionCookie(res, { userId: user.id, email: user.email });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      activeGroupId: null,
    });
  } catch (err) {
    console.error("oauth callback error:", err);
    return res.status(401).json({ message: "Authentication failed" });
  }
});

/**
 * GET /auth/me
 * Returns the current user + active group/role from the session. Also
 * re-validates that any active group in the session is still one the user
 * belongs to; if not, the active group is cleared so the client re-onboards.
 */
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const session = req.session!;
    const user = await AppDataSource.getRepository(User).findOne({
      where: { id: session.userId },
    });
    if (!user) {
      clearSessionCookie(res);
      return res.status(401).json({ message: "User no longer exists" });
    }

    let activeGroupId = session.activeGroupId ?? null;
    let activeRole = session.activeRole ?? null;

    // Re-validate the active group membership is still valid.
    if (activeGroupId) {
      const membership = await getMembership(user.id, activeGroupId);
      if (!membership) {
        activeGroupId = null;
        activeRole = null;
        // Downgrade the session to no-active-group.
        setSessionCookie(res, { userId: user.id, email: user.email });
      } else {
        activeRole = membership.role;
      }
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      activeGroupId,
      activeRole,
    });
  } catch (err) {
    console.error("auth/me error:", err);
    return res.status(500).json({ message: "Failed to load session" });
  }
});

/** POST /auth/logout — clear the session cookie. */
router.post("/logout", (_req: Request, res: Response) => {
  clearSessionCookie(res);
  return res.json({ ok: true });
});

export default router;
