import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1700000000000 implements MigrationInterface {
  name = "InitSchema1700000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID generation (gen_random_uuid) via pgcrypto.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // users
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "email" varchar NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      );
    `);

    // categories
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "name" varchar NOT NULL,
        "is_default" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_categories_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_categories_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_categories_user_id" ON "categories" ("user_id");`
    );

    // expenses source enum
    await queryRunner.query(
      `CREATE TYPE "expenses_source_enum" AS ENUM ('voice', 'manual');`
    );

    // expenses
    await queryRunner.query(`
      CREATE TABLE "expenses" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "category_id" uuid,
        "title" varchar NOT NULL,
        "cost" numeric(12,2),
        "pending" boolean NOT NULL DEFAULT true,
        "source" "expenses_source_enum" NOT NULL,
        "original_transcript" text,
        "date" date NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_expenses_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_expenses_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_expenses_category" FOREIGN KEY ("category_id")
          REFERENCES "categories" ("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_expenses_user_id" ON "expenses" ("user_id");`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_expenses_category_id" ON "expenses" ("category_id");`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_expenses_pending" ON "expenses" ("pending");`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_expenses_date" ON "expenses" ("date");`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "expenses";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "expenses_source_enum";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
  }
}
