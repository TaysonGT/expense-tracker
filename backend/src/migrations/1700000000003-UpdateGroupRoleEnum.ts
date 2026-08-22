import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateGroupRoleEnum1700000000003 implements MigrationInterface {
  name = "UpdateGroupRoleEnum1700000000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create new enum with all required values
    await queryRunner.query(`
      CREATE TYPE "group_role_new" AS ENUM ('admin', 'read_write', 'readonly');
    `);

    // Step 2: Drop the default (required before changing enum type)
    await queryRunner.query(`
      ALTER TABLE "group_memberships" 
      ALTER COLUMN "role" DROP DEFAULT;
    `);

    // Step 3: Alter column to use new enum, converting 'viewer' -> 'readonly' on the fly
    await queryRunner.query(`
      ALTER TABLE "group_memberships" 
      ALTER COLUMN "role" TYPE "group_role_new" 
      USING CASE 
        WHEN "role"::text = 'viewer' THEN 'readonly'::"group_role_new"
        ELSE "role"::text::"group_role_new"
      END;
    `);

    // Step 3: Drop the old enum and rename the new one
    await queryRunner.query(`
      DROP TYPE "group_role_enum";
    `);

    await queryRunner.query(`
      ALTER TYPE "group_role_new" RENAME TO "group_role_enum";
    `);

    // Step 4: Update default value for new memberships
    await queryRunner.query(`
      ALTER TABLE "group_memberships" 
      ALTER COLUMN "role" SET DEFAULT 'readonly';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Drop the default first
    await queryRunner.query(`
      ALTER TABLE "group_memberships" 
      ALTER COLUMN "role" DROP DEFAULT;
    `);

    // Step 2: Create old enum with old values
    await queryRunner.query(`
      CREATE TYPE "group_role_old" AS ENUM ('admin', 'viewer');
    `);

    // Step 3: Alter column back to old enum, converting 'readonly'/'read_write' -> 'viewer'
    await queryRunner.query(`
      ALTER TABLE "group_memberships" 
      ALTER COLUMN "role" TYPE "group_role_old" 
      USING CASE 
        WHEN "role"::text IN ('readonly', 'read_write') THEN 'viewer'::"group_role_old"
        ELSE "role"::text::"group_role_old"
      END;
    `);

    // Step 3: Drop the current enum and rename old
    await queryRunner.query(`
      DROP TYPE "group_role_enum";
    `);

    await queryRunner.query(`
      ALTER TYPE "group_role_old" RENAME TO "group_role_enum";
    `);

    // Step 4: Revert default
    await queryRunner.query(`
      ALTER TABLE "group_memberships" 
      ALTER COLUMN "role" SET DEFAULT 'viewer';
    `);
  }
}
