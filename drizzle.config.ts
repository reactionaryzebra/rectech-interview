import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/api/db/schema.ts",
  out: "./src/api/db/migrations",
  dbCredentials: {
    url: process.env.DB_PATH ?? "dev.db",
  },
});
