import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import type { OAuthProfile } from "./oauth";

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
