import { Router } from "express";
import { z } from "zod";
import { prisma } from "@bluebex/db";
import type { Prisma } from "@prisma/client";
import { requireAuth, type AuthedRequest } from "../lib/auth.js";
import { accessibleProcessIds, accessibleProjectsWithProcesses, canAccessProcess } from "../lib/access.js";

export const tasksRouter = Router();

tasksRouter.use(requireAuth);

tasksRouter.get("/", async (req: AuthedRequest, res) => {
  const processIds = await accessibleProcessIds(req.user!.id);
  if (processIds.length === 0) return res.json({ tasks: [] });

  const query = z
    .object({
      assignedToId: z.string().optional(),
      status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
      processId: z.string().optional(),
      projectId: z.string().optional(),
      search: z.string().optional(),
    })
    .parse(req.query);

  const search = query.search?.trim();

  const where: Prisma.TaskWhereInput = {
    processId: { in: processIds },
    ...(query.assignedToId ? { assignedToId: query.assignedToId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.processId ? { processId: query.processId } : {}),
    ...(query.projectId ? { projectId: query.projectId } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      createdBy: { select: { id: true, username: true, name: true } },
      assignedTo: { select: { id: true, username: true, name: true } },
      process: { select: { id: true, name: true, projectId: true } },
      project: { select: { id: true, name: true } },
    },
  });
  res.json({ tasks });
});

tasksRouter.post("/", async (req: AuthedRequest, res) => {
  const body = z
    .object({
      title: z.string().min(1),
      description: z.string().optional(),
      processId: z.string().min(1),
      assignedToId: z.string().optional(),
    })
    .parse(req.body);

  const access = await canAccessProcess(req.user!.id, body.processId);
  if (!access.ok) return res.status(403).json({ error: access.reason });

  const lastTask = await prisma.task.findFirst({ orderBy: { taskNumber: "desc" }, select: { taskNumber: true } });
  const taskNumber = (lastTask?.taskNumber ?? 1000000) + 1;

  const task = await prisma.task.create({
    data: {
      taskNumber,
      title: body.title,
      description: body.description,
      processId: body.processId,
      projectId: access.projectId,
      createdById: req.user!.id,
      assignedToId: body.assignedToId,
      status: "TODO",
      statusLogs: { create: { userId: req.user!.id, fromStatus: null, toStatus: "TODO" } },
    },
    include: {
      createdBy: { select: { id: true, username: true, name: true } },
      assignedTo: { select: { id: true, username: true, name: true } },
      process: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });

  res.json({ task });
});

tasksRouter.get("/meta", async (req: AuthedRequest, res) => {
  const [projects, users] = await Promise.all([
    accessibleProjectsWithProcesses(req.user!.id),
    prisma.user.findMany({
      where: { role: "USER" },
      orderBy: { name: "asc" },
      select: { id: true, username: true, name: true },
    }),
  ]);
  res.json({ projects, users });
});

tasksRouter.get("/:id", async (req: AuthedRequest, res) => {
  const param = z.string().parse(req.params.id);
  const isNumber = /^\d+$/.test(param);
  const task = await prisma.task.findUnique({
    where: isNumber ? { taskNumber: Number(param) } : { id: param },
    include: {
      createdBy: { select: { id: true, username: true, name: true } },
      assignedTo: { select: { id: true, username: true, name: true } },
      process: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, username: true, name: true } } },
      },
      statusLogs: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, username: true, name: true } } },
      },
    },
  });
  if (!task) return res.status(404).json({ error: "Not found" });

  const processIds = await accessibleProcessIds(req.user!.id);
  if (!processIds.includes(task.processId)) return res.status(403).json({ error: "No access" });

  res.json({ task });
});

tasksRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const param = z.string().parse(req.params.id);
  const isNumber = /^\d+$/.test(param);
  const body = z
    .object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      assignedToId: z.string().nullable().optional(),
      status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
    })
    .parse(req.body);

  const existing = await prisma.task.findUnique({
    where: isNumber ? { taskNumber: Number(param) } : { id: param },
    select: { id: true, processId: true, status: true },
  });
  if (!existing) return res.status(404).json({ error: "Not found" });
  const id = existing.id;

  const processIds = await accessibleProcessIds(req.user!.id);
  if (!processIds.includes(existing.processId)) return res.status(403).json({ error: "No access" });

  const updates: Prisma.TaskUpdateInput = {
    ...(body.title ? { title: body.title } : {}),
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.assignedToId !== undefined ? { assignedToId: body.assignedToId } : {}),
  };

  const tx: Prisma.PrismaPromise<unknown>[] = [];
  tx.push(prisma.task.update({ where: { id }, data: updates }));

  if (body.status && body.status !== existing.status) {
    tx.push(
      prisma.taskStatusLog.create({
        data: { taskId: id, userId: req.user!.id, fromStatus: existing.status, toStatus: body.status },
      }),
    );
    tx.push(prisma.task.update({ where: { id }, data: { status: body.status } }));
  }

  await prisma.$transaction(tx as any);
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, username: true, name: true } },
      assignedTo: { select: { id: true, username: true, name: true } },
      process: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });
  res.json({ task });
});

tasksRouter.post("/:id/comments", async (req: AuthedRequest, res) => {
  const param = z.string().parse(req.params.id);
  const isNumber = /^\d+$/.test(param);
  const body = z.object({ body: z.string().min(1) }).parse(req.body);

  const task = await prisma.task.findUnique({
    where: isNumber ? { taskNumber: Number(param) } : { id: param },
    select: { id: true, processId: true },
  });
  if (!task) return res.status(404).json({ error: "Not found" });

  const processIds = await accessibleProcessIds(req.user!.id);
  if (!processIds.includes(task.processId)) return res.status(403).json({ error: "No access" });

  const comment = await prisma.comment.create({
    data: { taskId: task.id, userId: req.user!.id, body: body.body },
    include: { user: { select: { id: true, username: true, name: true } } },
  });
  res.json({ comment });
});

