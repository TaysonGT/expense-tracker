import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPasswordHash1700000000002 implements MigrationInterface {
  name = "AddPasswordHash1700000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "password_hash" character varying NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_hash"`);
  }
}