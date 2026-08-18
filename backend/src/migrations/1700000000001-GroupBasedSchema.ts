import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Group-based (multi-tenant) schema.
 *
 * Moves the domain from user-centric ownership to group-scoped tenancy:
 *  - users become OAuth identities with no direct expense/category ownership
 *  - groups are the tenant boundary (currency, show_balance, join_code)
 *  - group_memberships link users to groups with a role (admin | viewer)
 *  - categories and expenses belong to a group; expenses record created_by
 *
 * This is a structural rewrite of the v1 schema. v1 had no auth and only a
 * seeded dev user, so this migration drops and recreates the affected tables
 * rather than attempting a data-preserving backfill.
 */
export class GroupBasedSchema1700000000001 implements MigrationInterface {
  name = "GroupBasedSchema1700000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // Drop v1 user-centric tables (dev-only data, no backfill needed).
    await queryRunner.query(`DROP TABLE IF EXISTS "expenses" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS "expenses_source_enum";`);

    // ----- users (OAuth identities) -----
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "provider" varchar NOT NULL,
        "provider_id" varchar NOT NULL,
        "email" varchar NOT NULL,
        "name" varchar NOT NULL,
        "avatar_url" varchar,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_users_provider_provider_id"
          UNIQUE ("provider", "provider_id")
      );
    `);

    // ----- join-code generator (8-char, unambiguous alphabet) -----
    // Used as the DEFAULT for groups.join_code so codes are generated even
    // when a row is inserted outside the application layer.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION gen_join_code() RETURNS varchar AS $$
      DECLARE
        alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        result text := '';
        i integer;
      BEGIN
        FOR i IN 1..8 LOOP
          result := result ||
            substr(alphabet, floor(random() * length(alphabet) + 1)::int, 1);
        END LOOP;
        RETURN result;
      END;
      $$ LANGUAGE plpgsql VOLATILE;
    `);

    // ----- groups (tenant boundary) -----
    await queryRunner.query(`
      CREATE TABLE "groups" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'USD',
        "show_balance" boolean NOT NULL DEFAULT true,
        "join_code" varchar(8) NOT NULL DEFAULT gen_join_code(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_groups_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_groups_join_code" UNIQUE ("join_code")
      );
    `);
    // Explicit index on join_code (in addition to the unique constraint) for
    // fast join-by-code lookups.
    await queryRunner.query(
      `CREATE INDEX "IDX_groups_join_code" ON "groups" ("join_code");`
    );

    // ----- group_memberships (junction) -----
    await queryRunner.query(
      `CREATE TYPE "group_role_enum" AS ENUM ('admin', 'viewer');`
    );
    await queryRunner.query(`
      CREATE TABLE "group_memberships" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "group_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" "group_role_enum" NOT NULL DEFAULT 'viewer',
        "joined_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_group_memberships_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_group_memberships_group_user"
          UNIQUE ("group_id", "user_id"),
        CONSTRAINT "FK_group_memberships_group" FOREIGN KEY ("group_id")
          REFERENCES "groups" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_group_memberships_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_group_memberships_group_user"
         ON "group_memberships" ("group_id", "user_id");`
    );

    // ----- categories (group-scoped) -----
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "group_id" uuid NOT NULL,
        "name" varchar NOT NULL,
        "color" varchar,
        "icon" varchar,
        "is_base" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_categories_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_categories_group" FOREIGN KEY ("group_id")
          REFERENCES "groups" ("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_categories_group_id" ON "categories" ("group_id");`
    );

    // ----- expenses (group-scoped, created_by audit) -----
    await queryRunner.query(
      `CREATE TYPE "expenses_source_enum" AS ENUM ('voice', 'manual');`
    );
    await queryRunner.query(`
      CREATE TABLE "expenses" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "group_id" uuid NOT NULL,
        "created_by" uuid NOT NULL,
        "category_id" uuid,
        "title" varchar NOT NULL,
        "cost" numeric(12,2),
        "pending" boolean NOT NULL DEFAULT true,
        "source" "expenses_source_enum" NOT NULL,
        "original_transcript" text,
        "date" date NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_expenses_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_expenses_group" FOREIGN KEY ("group_id")
          REFERENCES "groups" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_expenses_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_expenses_category" FOREIGN KEY ("category_id")
          REFERENCES "categories" ("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_expenses_group_id" ON "expenses" ("group_id");`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_expenses_category_id" ON "expenses" ("category_id");`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_expenses_created_by" ON "expenses" ("created_by");`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_expenses_pending" ON "expenses" ("pending");`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_expenses_date" ON "expenses" ("date");`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "expenses" CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS "expenses_source_enum";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories" CASCADE;`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "group_memberships" CASCADE;`
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "group_role_enum";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "groups" CASCADE;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS gen_join_code();`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE;`);
  }
}
