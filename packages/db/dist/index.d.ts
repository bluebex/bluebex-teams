import { PrismaClient } from "@prisma/client";
declare global {
    var __bluebexPrisma: PrismaClient | undefined;
}
export declare const prisma: any;
