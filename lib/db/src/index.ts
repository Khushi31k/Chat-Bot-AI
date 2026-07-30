import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { fileURLToPath } from "node:url";
import * as schema from "./schema";

const defaultDatabaseFile = fileURLToPath(
  new URL("../../../data/ella.sqlite", import.meta.url),
);
const databaseFile = process.env.DB_FILE_NAME ?? defaultDatabaseFile;

export const sqlite = new Database(databaseFile, { create: true });
sqlite.exec("PRAGMA foreign_keys = ON;");
sqlite.exec("PRAGMA journal_mode = WAL;");

export const db = drizzle({ client: sqlite, schema });

export * from "./schema";
