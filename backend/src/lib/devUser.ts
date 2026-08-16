import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { Category } from "../entities/Category";

/**
 * v1 has no authentication (see PROJECT_SPEC.md — Out of Scope). To keep the
 * schema's user scoping intact, we lazily seed a single "dev" user plus a set
 * of default categories, and treat every request as that user.
 *
 * Replace with real auth/session lookup later.
 */

const DEV_EMAIL = "dev@example.com";

const DEFAULT_CATEGORY_NAMES = [
  "Groceries",
  "Dining",
  "Transport",
  "Household",
  "Health",
  "Other",
];

let cachedUserId: string | null = null;

export async function getDevUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;

  const userRepo = AppDataSource.getRepository(User);
  const categoryRepo = AppDataSource.getRepository(Category);

  let user = await userRepo.findOne({ where: { email: DEV_EMAIL } });
  if (!user) {
    user = userRepo.create({ name: "Dev User", email: DEV_EMAIL });
    user = await userRepo.save(user);
  }

  // Seed default categories once, if none exist for this user.
  const existingCount = await categoryRepo.count({
    where: { userId: user.id },
  });
  if (existingCount === 0) {
    const categories = DEFAULT_CATEGORY_NAMES.map((name) =>
      categoryRepo.create({ userId: user!.id, name, isDefault: true })
    );
    await categoryRepo.save(categories);
  }

  cachedUserId = user.id;
  return user.id;
}
