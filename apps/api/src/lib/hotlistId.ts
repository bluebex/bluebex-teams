import { prisma } from "@bluebex/db";

export const HOTLIST_ID_PATTERN = /^\d{6}$/;

export function generateHotlistId(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function generateUniqueHotlistId(): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const hotlistId = generateHotlistId();
    const existing = await prisma.hotlist.findUnique({
      where: { hotlistId },
      select: { id: true },
    });
    if (!existing) return hotlistId;
  }
  throw new Error("Failed to generate unique hotlist id");
}

export async function resolveHotlistInternalIds(publicIds: string[]): Promise<string[]> {
  if (publicIds.length === 0) return [];
  const hotlists = await prisma.hotlist.findMany({
    where: { hotlistId: { in: publicIds } },
    select: { id: true, hotlistId: true },
  });
  if (hotlists.length !== publicIds.length) {
    throw new Error("One or more hotlists not found");
  }
  return hotlists.map((h) => h.id);
}
