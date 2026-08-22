import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { User } from "./entities/User";
import { Group } from "./entities/Group";
import { GroupMembership } from "./entities/GroupMembership";
import { Category } from "./entities/Category";
import { Expense } from "./entities/Expense";
import { InitSchema1700000000000 } from "./migrations/1700000000000-InitSchema";
import { GroupBasedSchema1700000000001 } from "./migrations/1700000000001-GroupBasedSchema";
import { AddPasswordHash1700000000002 } from "./migrations/1700000000002-AddPasswordHash";
import { UpdateGroupRoleEnum1700000000003 } from "./migrations/1700000000003-UpdateGroupRoleEnum";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "expense_tracker",
  ssl: {
    rejectUnauthorized: false // Set to true if you are passing a valid CA certificate
  },
  //Migrations manage the schema; never auto-sync in any environment.
  synchronize: false,
  logging: false,
  entities: [User, Group, GroupMembership, Category, Expense],
  migrations: [InitSchema1700000000000, GroupBasedSchema1700000000001, AddPasswordHash1700000000002, UpdateGroupRoleEnum1700000000003],
});
