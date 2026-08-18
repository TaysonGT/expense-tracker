import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import type { OAuthProfile } from "./oauth";
import * as bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

/**
 * Find an existing user by (provider, providerId) or create one from a
 * verified OAuth profile. Email/name/avatar are refreshed on each login so the
 * local copy stays in sync with the provider.
 */
export async function findOrCreateUser(profile: OAuthProfile): Promise<User> {
  const userRepo = AppDataSource.getRepository(User);

  let user = await userRepo.findOne({
    where: { provider: profile.provider, providerId: profile.providerId },
  });

  if (user) {
    // Keep profile fields fresh.
    user.email = profile.email;
    user.name = profile.name;
    user.avatarUrl = profile.avatarUrl;
    return userRepo.save(user);
  }

  user = userRepo.create({
    provider: profile.provider,
    providerId: profile.providerId,
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
  });
  return userRepo.save(user);
}

/**
 * Find a user by email address (works for both OAuth and local password users).
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const userRepo = AppDataSource.getRepository(User);
  return userRepo.findOne({ where: { email } });
}

/**
 * Hash a plain‑text password and return the bcrypt hash string.
 */
export async function hashPassword(plain: string): Promise<string> {
  return await bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Compare a plain‑text password against a bcrypt hash.
 * Returns true if it matches.
 */
export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return await bcrypt.compare(plain, hashed);
}

/** Convenience: set a password on a user record and persist it. */
export async function setUserPassword(userId: string, plainPassword: string): Promise<User> {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  user.passwordHash = await hashPassword(plainPassword);
  return userRepo.save(user);
}
