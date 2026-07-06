import { Router } from "express";
import { z } from "zod";
import { prisma } from "@bluebex/db";
import { requireAuth, type AuthedRequest } from "../lib/auth.js";
import { generateUniqueHotlistId } from "../lib/hotlistId.js";

export const hotlistsRouter = Router();

hotlistsRouter.use(requireAuth);

const hotlistSelect = { id: true, hotlistId: true, name: true } as const;

hotlistsRouter.get("/", async (_req: AuthedRequest, res) => {
  const hotlists = await prisma.hotlist.findMany({
    orderBy: { name: "asc" },
    select: hotlistSelect,
  });
  res.json({ hotlists });
});

hotlistsRouter.post("/", async (req: AuthedRequest, res) => {
  try {
    const body = z.object({ name: z.string().trim().min(1).max(120) }).parse(req.body);
    const hotlistId = await generateUniqueHotlistId();
    const hotlist = await prisma.hotlist.create({
      data: {
        hotlistId,
        name: body.name,
        createdById: req.user!.id,
      },
      select: hotlistSelect,
    });
    res.json({ hotlist });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues[0]?.message ?? "Invalid request" });
    }
    console.error("POST /hotlists failed:", err);
    return res.status(500).json({ error: "Failed to create hotlist" });
  }
});
