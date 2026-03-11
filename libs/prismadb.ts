import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

// 1. Define a function that creates the extended client
const prismaClientSingleton = () => {
  return new PrismaClient({
    // Only uncomment the line below if your accelerate URL isn't automatically picked up from .env
    accelerateUrl: process.env.PRISMA_ACCELERATE_URL, 
  }).$extends(withAccelerate());
};

// 2. Define the global type so TypeScript doesn't complain
declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

// 3. Instantiate the client:
// If it already exists in the global object, use it. If not, create a new one.
export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

// 4. In development, save the instance to the global object so hot-reloading doesn't create new connections
if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
