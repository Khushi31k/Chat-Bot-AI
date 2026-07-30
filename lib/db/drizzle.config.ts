import { defineConfig } from "drizzle-kit";
import path from "path";
import { fileURLToPath } from "node:url";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const databaseFile =
  process.env.DB_FILE_NAME ??
  path.resolve(configDirectory, "../../data/ella.sqlite");

export default defineConfig({
  schema: path.join(configDirectory, "./src/schema/index.ts"),
  dialect: "sqlite",
  dbCredentials: {
    url: databaseFile,
  },
});
