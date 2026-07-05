import { Router } from "express";
import { z } from "zod";
import { prisma } from "@bluebex/db";
import type { Prisma } from "@prisma/client";
import { requireAuth, type AuthedRequest } from "../lib/auth.js";
import { accessibleProcessIds, accessibleProjectsWithProcesses, canAccessProcess } from "../lib/access.js";
import { generateUniqueTaskPublicId, taskWhereFromParam } from "../lib/taskPublicId.js";

export const tasksRouter = Router();

tasksRouter.use(requireAuth);

async function assigneeLabel(userId: string | null | undefined) {
  if (!userId) return "Unassigned";
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  return user?.name ?? "Unknown";
}

function etaToStored(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

function etaToLogValue(value: Date | null | undefined) {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function etaTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isEtaBeforeToday(eta: string) {
  return eta < etaTodayString();
}

tasksRouter.get("/", async (req: AuthedRequest, res) => {
  try {
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
            { publicId: { contains: search, mode: "insensitive" } },
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
  } catch (err) {
    console.error("GET /tasks failed:", err);
    return res.status(500).json({ error: "Failed to load tasks" });
  }
});

tasksRouter.post("/", async (req: AuthedRequest, res) => {
  const body = z
    .object({
      title: z.string().min(1),
      description: z.string().optional(),
      processId: z.string().min(1),
      assignedToId: z.string().optional(),
      priority: z.enum(["P0", "P1", "P2"]).optional(),
      category: z.enum(["TASK", "BUG"]).optional(),
      eta: z.string().date().optional(),
    })
    .parse(req.body);

  const access = await canAccessProcess(req.user!.id, body.processId);
  if (!access.ok) return res.status(403).json({ error: access.reason });

  if (body.eta && isEtaBeforeToday(body.eta)) {
    return res.status(400).json({ error: "ETA cannot be before today" });
  }

  const lastTask = await prisma.task.findFirst({ orderBy: { taskNumber: "desc" }, select: { taskNumber: true } });
  const taskNumber = (lastTask?.taskNumber ?? 1000000) + 1;
  const publicId = await generateUniqueTaskPublicId();

  const task = await prisma.task.create({
    data: {
      publicId,
      taskNumber,
      title: body.title,
      description: body.description,
      processId: body.processId,
      projectId: access.projectId,
      createdById: req.user!.id,
      assignedToId: body.assignedToId,
      priority: body.priority ?? "P1",
      category: body.category ?? "TASK",
      ...(body.eta ? { eta: etaToStored(body.eta) } : {}),
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
  const task = await prisma.task.findUnique({
    where: taskWhereFromParam(param),
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
      changeLogs: {
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
  try {
  const param = z.string().parse(req.params.id);
  const body = z
    .object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      assignedToId: z.string().nullable().optional(),
      status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
      priority: z.enum(["P0", "P1", "P2"]).optional(),
      category: z.enum(["TASK", "BUG"]).optional(),
      eta: z.union([z.string().date(), z.null()]).optional(),
    })
    .parse(req.body);

  const existing = await prisma.task.findUnique({
    where: taskWhereFromParam(param),
    select: {
      id: true,
      processId: true,
      status: true,
      priority: true,
      category: true,
      eta: true,
      title: true,
      description: true,
      assignedToId: true,
      assignedTo: { select: { name: true } },
    },
  });
  if (!existing) return res.status(404).json({ error: "Not found" });
  const id = existing.id;

  if (body.eta && isEtaBeforeToday(body.eta)) {
    return res.status(400).json({ error: "ETA cannot be before today" });
  }

  const processIds = await accessibleProcessIds(req.user!.id);
  if (!processIds.includes(existing.processId)) return res.status(403).json({ error: "No access" });

  const updates: Prisma.TaskUpdateInput = {
    ...(body.title ? { title: body.title } : {}),
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.assignedToId !== undefined ? { assignedToId: body.assignedToId } : {}),
    ...(body.priority ? { priority: body.priority } : {}),
    ...(body.category ? { category: body.category } : {}),
    ...(body.eta !== undefined ? { eta: body.eta ? etaToStored(body.eta) : null } : {}),
  };

  const tx: Prisma.PrismaPromise<unknown>[] = [];
  tx.push(prisma.task.update({ where: { id }, data: updates }));

  if (body.title && body.title !== existing.title) {
    tx.push(
      prisma.taskChangeLog.create({
        data: {
          taskId: id,
          userId: req.user!.id,
          field: "title",
          fromValue: existing.title,
          toValue: body.title,
        },
      }),
    );
  }

  if (body.description !== undefined) {
    const fromDesc = existing.description ?? "";
    const toDesc = body.description;
    if (fromDesc !== toDesc) {
      tx.push(
        prisma.taskChangeLog.create({
          data: {
            taskId: id,
            userId: req.user!.id,
            field: "description",
            fromValue: fromDesc || null,
            toValue: toDesc || null,
          },
        }),
      );
    }
  }

  if (body.assignedToId !== undefined && body.assignedToId !== existing.assignedToId) {
    const fromName = existing.assignedTo?.name ?? "Unassigned";
    const toName = await assigneeLabel(body.assignedToId);
    tx.push(
      prisma.taskChangeLog.create({
        data: {
          taskId: id,
          userId: req.user!.id,
          field: "assignedTo",
          fromValue: fromName,
          toValue: toName,
        },
      }),
    );
  }

  if (body.priority && body.priority !== existing.priority) {
    tx.push(
      prisma.taskChangeLog.create({
        data: {
          taskId: id,
          userId: req.user!.id,
          field: "priority",
          fromValue: existing.priority,
          toValue: body.priority,
        },
      }),
    );
  }

  if (body.category && body.category !== existing.category) {
    tx.push(
      prisma.taskChangeLog.create({
        data: {
          taskId: id,
          userId: req.user!.id,
          field: "category",
          fromValue: existing.category,
          toValue: body.category,
        },
      }),
    );
  }

  if (body.eta !== undefined) {
    const fromEta = etaToLogValue(existing.eta);
    const toEta = body.eta;
    if (fromEta !== toEta) {
      tx.push(
        prisma.taskChangeLog.create({
          data: {
            taskId: id,
            userId: req.user!.id,
            field: "eta",
            fromValue: fromEta,
            toValue: toEta,
          },
        }),
      );
    }
  }

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
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues[0]?.message ?? "Invalid request" });
    }
    console.error("PATCH /tasks/:id failed:", err);
    return res.status(500).json({ error: "Failed to update task" });
  }
});

tasksRouter.post("/:id/comments", async (req: AuthedRequest, res) => {
  const param = z.string().parse(req.params.id);
  const body = z.object({ body: z.string().min(1) }).parse(req.body);

  const task = await prisma.task.findUnique({
    where: taskWhereFromParam(param),
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

