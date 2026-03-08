import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const prisma =
  process.env.NODE_ENV === "production"
    ? new PrismaClient({
        accelerateUrl: process.env.PRISMA_ACCELERATE_URL,
      }).$extends(withAccelerate())
    : new PrismaClient();

export default prisma;
