import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { InitSchema1700000000000 } from "./migrations/1700000000000-InitSchema";

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
  entities: [__dirname + "/entity/*.{js,ts}"],
  migrations: [InitSchema1700000000000],
});
