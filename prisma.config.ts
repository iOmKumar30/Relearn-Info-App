import { config as dotenvConfig } from "dotenv";
import path from "node:path";
import type { PrismaConfig } from "prisma";

// Load .env manually
dotenvConfig({ path: path.resolve(process.cwd(), ".env") });

export default {
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  views: {
    path: path.join("prisma", "views"),
  },
  typedSql: {
    path: path.join("prisma", "queries"),
  },
} satisfies PrismaConfig;
