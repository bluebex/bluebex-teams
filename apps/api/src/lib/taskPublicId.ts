import { prisma } from "@bluebex/db";
import type { Prisma } from "@prisma/client";

const PUBLIC_ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const TASK_PUBLIC_ID_PATTERN = /^[A-Z0-9]{7}$/i;

export function generateTaskPublicId(): string {
  let result = "";
  for (let i = 0; i < 7; i++) {
    result += PUBLIC_ID_CHARS[Math.floor(Math.random() * PUBLIC_ID_CHARS.length)];
  }
  return result;
}

export async function generateUniqueTaskPublicId(): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const publicId = generateTaskPublicId();
    const existing = await prisma.task.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!existing) return publicId;
  }
  throw new Error("Failed to generate unique task public id");
}

export function taskWhereFromParam(param: string): Prisma.TaskWhereUniqueInput {
  if (TASK_PUBLIC_ID_PATTERN.test(param)) {
    return { publicId: param.toUpperCase() };
  }
  if (/^\d+$/.test(param)) {
    return { taskNumber: Number(param) };
  }
  return { id: param };
}
