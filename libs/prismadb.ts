import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const prisma = new PrismaClient({
  accelerateUrl: process.env.PRISMA_ACCELERATE_URL,
}).$extends(withAccelerate());
export default prisma;
