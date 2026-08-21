import { Router, Request, Response } from "express";
import { requireAuth, requireGroupMembership, requireAdmin, requireRole } from "../middleware/auth";
import {
  createGroup,
  joinGroupByCode,
  listUserGroups,
  getGroupMembers,
  updateGroup,
  getGroupPreviewByCode,
  GroupError,
} from "../lib/groups";
import { setSessionCookie } from "../lib/session";
import { AppDataSource } from "../data-source";
import { Group } from "../entities/Group";
import { GroupMembership } from "../entities/GroupMembership";

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
 * GET /groups/preview/:code
 * Preview a group by join code without joining — used by the shareable join
 * link page. Returns name, currency, member count, admin name, and whether the
 * viewer is already a member. 404 for an unknown code.
 */
router.get("/preview/:code", async (req: Request, res: Response) => {
  try {
    const code = String(req.params.code);
    const preview = await getGroupPreviewByCode(code, req.session!.userId);
    return res.json(preview);
  } catch (err) {
    if (err instanceof GroupError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("group preview error:", err);
    return res.status(500).json({ message: "Failed to load group preview" });
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

/**
 * GET /groups/:groupId/members
 * List all members of a group (with role) — used by the group management page.
 * Requires membership.
 */
router.get(
  "/:groupId/members",
  requireGroupMembership,
  async (req: Request, res: Response) => {
    try {
      const groupId = String(req.params.groupId);
      const members = await getGroupMembers(groupId);
      return res.json(members);
    } catch (err) {
      console.error("list members error:", err);
      return res.status(500).json({ message: "Failed to list members" });
    }
  }
);

/**
 * PATCH /groups/:groupId
 * Update a group's name / currency / showBalance. Admin only.
 */
router.patch(
  "/:groupId",
  requireGroupMembership,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const groupId = String(req.params.groupId);
      const { name, currency, showBalance } = req.body ?? {};

      if (name !== undefined && (typeof name !== "string" || !name.trim())) {
        return res.status(400).json({ message: "name must be a non-empty string" });
      }
      if (
        currency !== undefined &&
        (typeof currency !== "string" || currency.length !== 3)
      ) {
        return res.status(400).json({ message: "currency must be a 3-letter code" });
      }
      if (showBalance !== undefined && typeof showBalance !== "boolean") {
        return res.status(400).json({ message: "showBalance must be a boolean" });
      }

      const group = await updateGroup(groupId, {
        name: typeof name === "string" ? name.trim() : undefined,
        currency: typeof currency === "string" ? currency.toUpperCase() : undefined,
        showBalance: typeof showBalance === "boolean" ? showBalance : undefined,
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
    if (err instanceof GroupError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("update group error:", err);
    return res.status(500).json({ message: "Failed to update group" });
  }
});

/**
 * DELETE /groups/:groupId/members/:userId
 * Kick a member from the group. Admin only.
 */
router.delete(
  "/:groupId/members/:userId",
  requireGroupMembership,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const groupId = String(req.params.groupId);
      const targetUserId = String(req.params.userId);

      // Prevent admin from kicking themselves
      if (targetUserId === req.session!.userId) {
        return res.status(400).json({ message: "Cannot remove yourself from the group" });
      }

      const membershipRepo = AppDataSource.getRepository(GroupMembership);
      const membership = await membershipRepo.findOne({ where: { groupId, userId: targetUserId } });
      if (!membership) {
        return res.status(404).json({ message: "Member not found" });
      }

      // Prevent kicking another admin (optional, but good practice)
      if (membership.role === "admin") {
        return res.status(400).json({ message: "Cannot remove another admin" });
      }

      await membershipRepo.remove(membership);
      return res.status(204).send();
    } catch (err) {
      console.error("kick member error:", err);
      return res.status(500).json({ message: "Failed to remove member" });
    }
  }
);

/**
 * PATCH /groups/:groupId/members/:userId
 * Change a member's role. Admin only.
 * Body: { role: "admin" | "read_write" | "readonly" }
 */
router.patch(
  "/:groupId/members/:userId",
  requireGroupMembership,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const groupId = String(req.params.groupId);
      const targetUserId = String(req.params.userId);
      const { role } = req.body ?? {};

      if (!["admin", "read_write", "readonly"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Prevent admin from changing their own role
      if (targetUserId === req.session!.userId) {
        return res.status(400).json({ message: "Cannot change your own role" });
      }

      const membershipRepo = AppDataSource.getRepository(GroupMembership);
      const membership = await membershipRepo.findOne({ where: { groupId, userId: targetUserId } });
      if (!membership) {
        return res.status(404).json({ message: "Member not found" });
      }

      // Prevent demoting another admin (optional)
      if (membership.role === "admin" && role !== "admin") {
        return res.status(400).json({ message: "Cannot demote another admin" });
      }

      membership.role = role;
      await membershipRepo.save(membership);

      return res.json({ id: membership.id, userId: membership.userId, groupId: membership.groupId, role: membership.role });
    } catch (err) {
      console.error("change member role error:", err);
      return res.status(500).json({ message: "Failed to change member role" });
    }
  }
);

export default router;
