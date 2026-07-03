import { PrismaClient } from "@prisma/client";
export const prisma = globalThis.__bluebexPrisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
if (process.env.NODE_ENV !== "production")
    globalThis.__bluebexPrisma = prisma;
