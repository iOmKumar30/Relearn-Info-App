import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // `prisma generate` only reads the schema, but it still loads this file.
    // Trigger.dev builds do not need (and should not require) a direct database
    // URL merely to generate the client. Database commands still require an
    // actual URL when they connect.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
