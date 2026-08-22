import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateGroupRoleEnum1700000000003 implements MigrationInterface {
  name = "UpdateGroupRoleEnum1700000000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the default first (PostgreSQL requires this before changing enum type)
    await queryRunner.query(`
      ALTER TABLE "group_memberships" 
      ALTER COLUMN "role" DROP DEFAULT;
    `);

    // Create a temporary enum with the new values
    await queryRunner.query(`
      CREATE TYPE "group_role_new" AS ENUM ('admin', 'read_write', 'readonly');
    `);

    // Update the column to use the new enum type
    await queryRunner.query(`
      ALTER TABLE "group_memberships" 
      ALTER COLUMN "role" TYPE "group_role_new" 
      USING "role"::text::"group_role_new";
    `);

    // Drop the old enum and rename the new one
    await queryRunner.query(`
      DROP TYPE "group_role";
    `);

    await queryRunner.query(`
      ALTER TYPE "group_role_new" RENAME TO "group_role";
    `);

    // Update default value for new memberships
    await queryRunner.query(`
      ALTER TABLE "group_memberships" 
      ALTER COLUMN "role" SET DEFAULT 'readonly';
    `);

    // Update existing 'viewer' roles to 'readonly'
    await queryRunner.query(`
      UPDATE "group_memberships" 
      SET "role" = 'readonly' 
      WHERE "role" = 'viewer';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the default first
    await queryRunner.query(`
      ALTER TABLE "group_memberships" 
      ALTER COLUMN "role" DROP DEFAULT;
    `);

    // Revert: create old enum with old values
    await queryRunner.query(`
      CREATE TYPE "group_role_old" AS ENUM ('admin', 'viewer');
    `);

    // Update column to old enum
    await queryRunner.query(`
      ALTER TABLE "group_memberships" 
      ALTER COLUMN "role" TYPE "group_role_old" 
      USING "role"::text::"group_role_old";
    `);

    // Drop new enum and rename old
    await queryRunner.query(`
      DROP TYPE "group_role";
    `);

    await queryRunner.query(`
      ALTER TYPE "group_role_old" RENAME TO "group_role";
    `);

    // Revert default
    await queryRunner.query(`
      ALTER TABLE "group_memberships" 
      ALTER COLUMN "role" SET DEFAULT 'viewer';
    `);

    // Revert readonly back to viewer
    await queryRunner.query(`
      UPDATE "group_memberships" 
      SET "role" = 'viewer' 
      WHERE "role" = 'readonly';
    `);
  }
}