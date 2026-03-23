import "dotenv/config";
import Database from "better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";

const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "kanobi.db");
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: "./drizzle" });
console.log("Migrations applied.");
sqlite.close();
