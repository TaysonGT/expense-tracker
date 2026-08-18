import { Router, Request, Response } from "express";
import { verifyOAuthToken, type OAuthProvider } from "../lib/oauth";
import { findOrCreateUser, findUserByEmail, hashPassword, setUserPassword } from "../lib/users";
import { verifyPassword } from "../lib/users";
import { setSessionCookie, clearSessionCookie } from "../lib/session";
import { requireAuth } from "../middleware/auth";
import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { getMembership } from "../lib/groups";
import { Request as ExpenseRequest } from "express";

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
 * POST /auth/register
 * Body: { email, password, name }
 * Creates a local-password user account and immediately logs them in.
 * The session has no active group yet; onboarding follows.
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body ?? {};
    if (typeof email !== "string" || email.length === 0 ||
        typeof password !== "string" || password.length === 0 ||
        typeof name !== "string" || name.length === 0) {
      return res.status(400).json({ message: "email, password and name are required" });
    }

    // Check if a user with this email already exists.
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // Create user with provider="local".
    const userRepo = AppDataSource.getRepository(User);
    let user = userRepo.create({
      provider: "local",
      providerId: email,          // use email as the local identifier
      email,
      name,
      avatarUrl: null,
    });
    user = await userRepo.save(user);

    // Set the hashed password.
    await setUserPassword(user.id, password);

    // Log them in immediately.
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
    console.error("register error:", err);
    return res.status(500).json({ message: "Registration failed" });
  }
});

/**
 * POST /auth/login
 * Body: { email, password }
 * Finds the user by email and verifies the local password.
 * On success, sets the session cookie and returns user info.
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || email.length === 0 ||
        typeof password !== "string" || password.length === 0) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // If the user has no password hash (OAuth-only), reject login.
    if (!user.passwordHash) {
      return res.status(401).json({ message: "Use OAuth to log in" });
    }

    const passwordMatch = await verifyPassword(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

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
    console.error("login error:", err);
    return res.status(500).json({ message: "Login failed" });
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

    // Re‑validate the active group membership is still valid.
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
