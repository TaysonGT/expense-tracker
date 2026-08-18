import { AppDataSource } from "../data-source";
import { Group } from "../entities/Group";
import { Category } from "../entities/Category";
import { GroupMembership, GroupRole } from "../entities/GroupMembership";
import { BASE_CATEGORIES } from "./baseCategories";

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
