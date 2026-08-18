import { Router, Request, Response } from "express";
import { requireAuth, requireGroupMembership } from "../middleware/auth";
import {
  createGroup,
  joinGroupByCode,
  listUserGroups,
  getMembership,
  GroupError,
} from "../lib/groups";
import { setSessionCookie } from "../lib/session";
import { AppDataSource } from "../data-source";
import { Group } from "../entities/Group";

const router = Router();

// All group routes require authentication.
router.use(requireAuth);

/**
 * GET /groups
 * List the groups the authenticated user belongs to (My Groups).
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const groups = await listUserGroups(req.session!.userId);
    return res.json(
      groups.map(({ group, role }) => ({
        id: group.id,
        name: group.name,
        currency: group.currency,
        showBalance: group.showBalance,
        joinCode: group.joinCode,
        role,
      }))
    );
  } catch (err) {
    console.error("list groups error:", err);
    return res.status(500).json({ message: "Failed to list groups" });
  }
});

/**
 * POST /groups
 * Create a group. Body: { name, currency?, showBalance? }.
 * Auto-generates join_code, clones base categories, makes creator admin, and
 * sets the new group active in the session.
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, currency, showBalance } = req.body ?? {};
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "name is required" });
    }
    if (currency !== undefined && (typeof currency !== "string" || currency.length !== 3)) {
      return res.status(400).json({ message: "currency must be a 3-letter code" });
    }

    const group = await createGroup({
      name: name.trim(),
      ownerUserId: req.session!.userId,
      currency: typeof currency === "string" ? currency.toUpperCase() : undefined,
      showBalance: typeof showBalance === "boolean" ? showBalance : undefined,
    });

    // Creator is admin; set active in the session.
    setSessionCookie(res, {
      userId: req.session!.userId,
      email: req.session!.email,
      activeGroupId: group.id,
      activeRole: "admin",
    });

    return res.status(201).json({
      id: group.id,
      name: group.name,
      currency: group.currency,
      showBalance: group.showBalance,
      joinCode: group.joinCode,
      role: "admin",
    });
  } catch (err) {
    console.error("create group error:", err);
    return res.status(500).json({ message: "Failed to create group" });
  }
});

/**
 * POST /groups/join
 * Body: { joinCode }. Validates code → creates viewer membership → sets active.
 */
router.post("/join", async (req: Request, res: Response) => {
  try {
    const { joinCode } = req.body ?? {};
    if (typeof joinCode !== "string" || !joinCode.trim()) {
      return res.status(400).json({ message: "joinCode is required" });
    }

    const { group, role } = await joinGroupByCode(
      req.session!.userId,
      joinCode
    );

    setSessionCookie(res, {
      userId: req.session!.userId,
      email: req.session!.email,
      activeGroupId: group.id,
      activeRole: role,
    });

    return res.json({
      id: group.id,
      name: group.name,
      currency: group.currency,
      showBalance: group.showBalance,
      joinCode: group.joinCode,
      role,
    });
  } catch (err) {
    if (err instanceof GroupError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("join group error:", err);
    return res.status(500).json({ message: "Failed to join group" });
  }
});

/**
 * POST /groups/:groupId/activate
 * Switch the active group. Requires membership; sets active_group_id +
 * active_role in the session.
 */
router.post(
  "/:groupId/activate",
  requireGroupMembership,
  async (req: Request, res: Response) => {
    try {
      const groupId = String(req.params.groupId);
      const group = await AppDataSource.getRepository(Group).findOne({
        where: { id: groupId },
      });
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      setSessionCookie(res, {
        userId: req.session!.userId,
        email: req.session!.email,
        activeGroupId: group.id,
        activeRole: req.groupRole,
      });

      return res.json({
        id: group.id,
        name: group.name,
        currency: group.currency,
        showBalance: group.showBalance,
        joinCode: group.joinCode,
        role: req.groupRole,
      });
    } catch (err) {
      console.error("activate group error:", err);
      return res.status(500).json({ message: "Failed to activate group" });
    }
  }
);

/**
 * GET /groups/:groupId
 * Details for a single group the user is a member of.
 */
router.get(
  "/:groupId",
  requireGroupMembership,
  async (req: Request, res: Response) => {
    try {
      const groupId = String(req.params.groupId);
      const group = await AppDataSource.getRepository(Group).findOne({
        where: { id: groupId },
      });
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      return res.json({
        id: group.id,
        name: group.name,
        currency: group.currency,
        showBalance: group.showBalance,
        joinCode: group.joinCode,
        role: req.groupRole,
      });
    } catch (err) {
      console.error("get group error:", err);
      return res.status(500).json({ message: "Failed to load group" });
    }
  }
);

export default router;
