import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { Group } from "../entities/Group";
import { GroupMembership } from "../entities/GroupMembership";
import { createGroup } from "./groups";

/**
 * v1 has no authentication (see PROJECT_SPEC.md — Out of Scope). To keep the
 * new group-scoped schema intact, we lazily seed a single "dev" user, a dev
 * group (with base categories cloned in), and an admin membership linking
 * them. Every request is then scoped to that user + group.
 *
 * Replace with real OAuth/session lookup + group selection later.
 */

const DEV_PROVIDER = "dev";
const DEV_PROVIDER_ID = "dev-user";
const DEV_EMAIL = "dev@example.com";
const DEV_GROUP_NAME = "Dev Group";

export interface DevContext {
  userId: string;
  groupId: string;
}

let cached: DevContext | null = null;

/**
 * Returns the seeded dev user id + group id, creating them on first call.
 */
export async function getDevContext(): Promise<DevContext> {
  if (cached) return cached;

  const userRepo = AppDataSource.getRepository(User);
  const membershipRepo = AppDataSource.getRepository(GroupMembership);
  const groupRepo = AppDataSource.getRepository(Group);

  // Seed the dev user.
  let user = await userRepo.findOne({ where: { email: DEV_EMAIL } });
  if (!user) {
    user = userRepo.create({
      provider: DEV_PROVIDER,
      providerId: DEV_PROVIDER_ID,
      email: DEV_EMAIL,
      name: "Dev User",
      avatarUrl: null,
    });
    user = await userRepo.save(user);
  }

  // Find an existing membership (and thus a group) for the dev user, else
  // create a dev group (which clones base categories + adds admin membership).
  let membership = await membershipRepo.findOne({
    where: { userId: user.id },
  });

  let groupId: string;
  if (membership) {
    groupId = membership.groupId;
  } else {
    const existingGroup = await groupRepo.findOne({
      where: { name: DEV_GROUP_NAME },
    });
    if (existingGroup) {
      groupId = existingGroup.id;
      const created = membershipRepo.create({
        groupId,
        userId: user.id,
        role: "admin",
      });
      await membershipRepo.save(created);
    } else {
      const group = await createGroup({
        name: DEV_GROUP_NAME,
        ownerUserId: user.id,
      });
      groupId = group.id;
    }
  }

  cached = { userId: user.id, groupId };
  return cached;
}

/** Convenience: the dev user's id. */
export async function getDevUserId(): Promise<string> {
  return (await getDevContext()).userId;
}

/** Convenience: the dev group's id (tenant scope for all v1 requests). */
export async function getDevGroupId(): Promise<string> {
  return (await getDevContext()).groupId;
}
