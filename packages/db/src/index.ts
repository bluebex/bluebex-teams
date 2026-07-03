import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __bluebexPrisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__bluebexPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalThis.__bluebexPrisma = prisma;

