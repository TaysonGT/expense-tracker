import { AppDataSource } from "../data-source";
import { Group } from "../entities/Group";
import { Category } from "../entities/Category";
import { GroupMembership, GroupRole } from "../entities/GroupMembership";
import { BASE_CATEGORIES } from "./baseCategories";

export class GroupError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "GroupError";
  }
}

/**
 * Group creation and join-code utilities.
 */

// Unambiguous alphabet (no 0/O, 1/I/L) for human-friendly join codes.
const JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const JOIN_CODE_LENGTH = 8;

/** Generate a random 8-char alphanumeric join code. */
export function generateJoinCode(): string {
  let code = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    const idx = Math.floor(Math.random() * JOIN_CODE_ALPHABET.length);
    code += JOIN_CODE_ALPHABET[idx];
  }
  return code;
}

/** Generate a join code guaranteed not to collide with an existing group. */
export async function generateUniqueJoinCode(): Promise<string> {
  const groupRepo = AppDataSource.getRepository(Group);
  // Practically never loops more than once given the code space (~10^11).
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateJoinCode();
    const existing = await groupRepo.findOne({ where: { joinCode: code } });
    if (!existing) return code;
  }
  throw new Error("Failed to generate a unique join code");
}

export interface CreateGroupOptions {
  name: string;
  ownerUserId: string;
  currency?: string;
  showBalance?: boolean;
}

/**
 * Create a group, clone the base categories into it (is_base = true), and add
 * the creating user as an admin member. Runs in a single transaction so a
 * partial group is never left behind.
 */
export async function createGroup(
  options: CreateGroupOptions
): Promise<Group> {
  const { name, ownerUserId, currency = "USD", showBalance = true } = options;

  return AppDataSource.transaction(async (manager) => {
    const joinCode = await generateUniqueJoinCode();

    const group = manager.getRepository(Group).create({
      name,
      currency,
      showBalance,
      joinCode,
    });
    const savedGroup = await manager.getRepository(Group).save(group);

    // Clone base categories into the new group.
    const categories = BASE_CATEGORIES.map((base) =>
      manager.getRepository(Category).create({
        groupId: savedGroup.id,
        name: base.name,
        color: base.color,
        icon: base.icon,
        isBase: true,
      })
    );
    await manager.getRepository(Category).save(categories);

    // Add the creator as an admin.
    const membership = manager.getRepository(GroupMembership).create({
      groupId: savedGroup.id,
      userId: ownerUserId,
      role: "admin" as GroupRole,
    });
    await manager.getRepository(GroupMembership).save(membership);

    return savedGroup;
  });
}

export interface GroupWithRole {
  group: Group;
  role: GroupRole;
}

/**
 * List the groups a user belongs to, along with their role in each. Newest
 * membership first.
 */
export async function listUserGroups(
  userId: string
): Promise<GroupWithRole[]> {
  const memberships = await AppDataSource.getRepository(GroupMembership).find({
    where: { userId },
    relations: { group: true },
    order: { joinedAt: "DESC" },
  });
  return memberships
    .filter((m) => m.group)
    .map((m) => ({ group: m.group, role: m.role }));
}

/** Return the user's membership in a group, or null if not a member. */
export async function getMembership(
  userId: string,
  groupId: string
): Promise<GroupMembership | null> {
  return AppDataSource.getRepository(GroupMembership).findOne({
    where: { userId, groupId },
  });
}

/**
 * Join a group by its 8-char join code. Creates a `viewer` membership. If the
 * user is already a member, returns the existing membership (idempotent).
 * Throws GroupError(404) for an unknown code.
 */
export async function joinGroupByCode(
  userId: string,
  rawCode: string
): Promise<GroupWithRole> {
  const code = rawCode.trim().toUpperCase();
  if (code.length !== JOIN_CODE_LENGTH) {
    throw new GroupError("Invalid join code", 400);
  }

  const groupRepo = AppDataSource.getRepository(Group);
  const membershipRepo = AppDataSource.getRepository(GroupMembership);

  const group = await groupRepo.findOne({ where: { joinCode: code } });
  if (!group) {
    throw new GroupError("No group found for that code", 404);
  }

  let membership = await membershipRepo.findOne({
    where: { userId, groupId: group.id },
  });
  if (!membership) {
    membership = membershipRepo.create({
      groupId: group.id,
      userId,
      role: "viewer" as GroupRole,
    });
    membership = await membershipRepo.save(membership);
  }

  return { group, role: membership.role };
}

