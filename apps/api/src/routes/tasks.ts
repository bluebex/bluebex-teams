import { Router } from "express";
import { z } from "zod";
import { prisma } from "@bluebex/db";
import type { Prisma } from "@prisma/client";
import { requireAuth, type AuthedRequest } from "../lib/auth.js";
import { accessibleProcessIds, accessibleProjectsWithProcesses, assignableUsersForProcesses, canAccessProcess, canUserBeAssignedToProcess } from "../lib/access.js";
import { generateUniqueTaskPublicId, taskWhereFromParam } from "../lib/taskPublicId.js";
import { resolveHotlistInternalIds } from "../lib/hotlistId.js";

export const tasksRouter = Router();

tasksRouter.use(requireAuth);

const hotlistPublicSelect = { id: true, hotlistId: true, name: true } as const;

const taskHotlistsInclude = {
  hotlists: {
    select: {
      hotlist: { select: hotlistPublicSelect },
    },
  },
} as const;

function mapTaskWithHotlists<
  T extends { hotlists: { hotlist: { id: string; hotlistId: string; name: string } }[] },
>(task: T) {
  const { hotlists, ...rest } = task;
  return {
    ...rest,
    hotlists: hotlists.map((link) => link.hotlist),
  };
}

async function linkTaskHotlists(taskId: string, publicHotlistIds: string[]) {
  const internalIds = await resolveHotlistInternalIds(publicHotlistIds);
  await prisma.taskHotlist.deleteMany({ where: { taskId } });
  if (internalIds.length > 0) {
    await prisma.taskHotlist.createMany({
      data: internalIds.map((hotlistId) => ({ taskId, hotlistId })),
    });
  }
}

function formatHotlistLogLabel(hotlist: { name: string; hotlistId: string }) {
  return `${hotlist.name} (${hotlist.hotlistId})`;
}

async function syncTaskHotlists(
  taskId: string,
  userId: string,
  publicHotlistIds: string[],
) {
  const currentLinks = await prisma.taskHotlist.findMany({
    where: { taskId },
    include: { hotlist: { select: hotlistPublicSelect } },
  });
  const currentPublicIds = new Set(currentLinks.map((link) => link.hotlist.hotlistId));
  const nextPublicIds = new Set(publicHotlistIds);

  const addedPublicIds = publicHotlistIds.filter((id) => !currentPublicIds.has(id));
  const removedLinks = currentLinks.filter((link) => !nextPublicIds.has(link.hotlist.hotlistId));

  await linkTaskHotlists(taskId, publicHotlistIds);

  const logs: Prisma.TaskChangeLogCreateManyInput[] = [];

  if (addedPublicIds.length > 0) {
    const addedHotlists = await prisma.hotlist.findMany({
      where: { hotlistId: { in: addedPublicIds } },
      select: hotlistPublicSelect,
    });
    for (const hotlist of addedHotlists) {
      logs.push({
        taskId,
        userId,
        field: "hotlist_add",
        fromValue: null,
        toValue: formatHotlistLogLabel(hotlist),
      });
    }
  }

  for (const link of removedLinks) {
    logs.push({
      taskId,
      userId,
      field: "hotlist_remove",
      fromValue: formatHotlistLogLabel(link.hotlist),
      toValue: null,
    });
  }

  if (logs.length > 0) {
    await prisma.taskChangeLog.createMany({ data: logs });
  }
}

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

const TASK_LIST_PAGE_SIZE_DEFAULT = 20;
const TASK_LIST_PAGE_SIZE_MAX = 100;

tasksRouter.get("/", async (req: AuthedRequest, res) => {
  try {
  const processIds = await accessibleProcessIds(req.user!.id);
  if (processIds.length === 0) {
    return res.json({
      tasks: [],
      pagination: { page: 1, pageSize: TASK_LIST_PAGE_SIZE_DEFAULT, total: 0, totalPages: 1 },
    });
  }

  const query = z
    .object({
      assignedToId: z.string().optional(),
      status: z.enum(["TODO", "IN_PROGRESS", "DONE", "INFEASIBLE"]).optional(),
      statusIn: z.string().optional(),
      processId: z.string().optional(),
      projectId: z.string().optional(),
      priority: z.enum(["P0", "P1", "P2"]).optional(),
      search: z.string().optional(),
      category: z.enum(["TASK", "BUG"]).optional(),
      view: z.enum(["assigned", "created"]).optional(),
      createdById: z.string().optional(),
      hotlistId: z.string().regex(/^\d{6}$/).optional(),
      eta: z.string().date().optional(),
      etaIsNull: z.enum(["true"]).optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce
        .number()
        .int()
        .min(1)
        .max(TASK_LIST_PAGE_SIZE_MAX)
        .default(TASK_LIST_PAGE_SIZE_DEFAULT),
    })
    .parse(req.query);

  const search = query.search?.trim();
  const taskStatusEnum = z.enum(["TODO", "IN_PROGRESS", "DONE", "INFEASIBLE"]);
  const statusIn = query.statusIn
    ? taskStatusEnum.array().parse(query.statusIn.split(",").filter(Boolean))
    : undefined;

  const where: Prisma.TaskWhereInput = {
    processId: { in: processIds },
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

  if (query.category) {
    where.category = query.category;
  }

  if (query.priority) {
    where.priority = query.priority;
  }

  if (query.hotlistId) {
    where.hotlists = { some: { hotlist: { hotlistId: query.hotlistId } } };
  }

  if (query.etaIsNull === "true") {
    where.eta = null;
  } else if (query.eta) {
    where.eta = etaToStored(query.eta);
  }

  if (query.view === "assigned") {
    where.assignedToId = req.user!.id;
    if (query.status) {
      where.status = query.status;
    } else if (statusIn?.length) {
      where.status = { in: statusIn };
    } else {
      where.status = { notIn: ["DONE", "INFEASIBLE"] };
    }
  } else if (query.view === "created") {
    where.createdById = req.user!.id;
    if (query.status) where.status = query.status;
    else if (statusIn?.length) where.status = { in: statusIn };
    if (query.assignedToId) where.assignedToId = query.assignedToId;
  } else {
    if (query.assignedToId) where.assignedToId = query.assignedToId;
    if (query.createdById) where.createdById = query.createdById;
    if (query.status) where.status = query.status;
    else if (statusIn?.length) where.status = { in: statusIn };
  }

  const total = await prisma.task.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(query.page, totalPages);

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * query.pageSize,
    take: query.pageSize,
    include: {
      createdBy: { select: { id: true, username: true, name: true } },
      assignedTo: { select: { id: true, username: true, name: true } },
      process: { select: { id: true, name: true, projectId: true } },
      project: { select: { id: true, name: true } },
      ...taskHotlistsInclude,
    },
  });

  res.json({
    tasks: tasks.map(mapTaskWithHotlists),
    pagination: {
      page,
      pageSize: query.pageSize,
      total,
      totalPages,
    },
  });
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
      hotlistIds: z.array(z.string().regex(/^\d{6}$/)).optional(),
    })
    .parse(req.body);

  const access = await canAccessProcess(req.user!.id, body.processId);
  if (!access.ok) return res.status(403).json({ error: access.reason });

  if (body.assignedToId) {
    const assignable = await canUserBeAssignedToProcess(body.assignedToId, body.processId);
    if (!assignable) {
      return res.status(400).json({ error: "Assignee does not have access to this process" });
    }
  }

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
      ...taskHotlistsInclude,
    },
  });

  if (body.hotlistIds?.length) {
    try {
      await syncTaskHotlists(task.id, req.user!.id, body.hotlistIds);
    } catch {
      return res.status(400).json({ error: "One or more hotlists not found" });
    }
  }

  const fullTask = await prisma.task.findUnique({
    where: { id: task.id },
    include: {
      createdBy: { select: { id: true, username: true, name: true } },
      assignedTo: { select: { id: true, username: true, name: true } },
      process: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      ...taskHotlistsInclude,
    },
  });

  res.json({ task: mapTaskWithHotlists(fullTask ?? task) });
});

tasksRouter.get("/meta", async (req: AuthedRequest, res) => {
  const query = z
    .object({
      processId: z.string().optional(),
    })
    .parse(req.query);

  const accessibleIds = await accessibleProcessIds(req.user!.id);
  let targetProcessIds = accessibleIds;
  if (query.processId) {
    if (!accessibleIds.includes(query.processId)) {
      return res.status(403).json({ error: "No access" });
    }
    targetProcessIds = [query.processId];
  }

  const [projects, users, hotlists] = await Promise.all([
    accessibleProjectsWithProcesses(req.user!.id),
    assignableUsersForProcesses(targetProcessIds),
    prisma.hotlist.findMany({
      orderBy: { name: "asc" },
      select: hotlistPublicSelect,
    }),
  ]);
  res.json({ projects, users, hotlists });
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
      ...taskHotlistsInclude,
    },
  });
  if (!task) return res.status(404).json({ error: "Not found" });

  const processIds = await accessibleProcessIds(req.user!.id);
  if (!processIds.includes(task.processId)) return res.status(403).json({ error: "No access" });

  res.json({ task: mapTaskWithHotlists(task) });
});

tasksRouter.patch("/:id", async (req: AuthedRequest, res) => {
  try {
  const param = z.string().parse(req.params.id);
  const body = z
    .object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      assignedToId: z.string().nullable().optional(),
      status: z.enum(["TODO", "IN_PROGRESS", "DONE", "INFEASIBLE"]).optional(),
      priority: z.enum(["P0", "P1", "P2"]).optional(),
      category: z.enum(["TASK", "BUG"]).optional(),
      eta: z.union([z.string().date(), z.null()]).optional(),
      hotlistIds: z.array(z.string().regex(/^\d{6}$/)).optional(),
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

  if (body.assignedToId) {
    const assignable = await canUserBeAssignedToProcess(body.assignedToId, existing.processId);
    if (!assignable) {
      return res.status(400).json({ error: "Assignee does not have access to this process" });
    }
  }

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

  if (body.hotlistIds !== undefined) {
    try {
      await syncTaskHotlists(id, req.user!.id, body.hotlistIds);
    } catch {
      return res.status(400).json({ error: "One or more hotlists not found" });
    }
  }

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, username: true, name: true } },
      assignedTo: { select: { id: true, username: true, name: true } },
      process: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      ...taskHotlistsInclude,
    },
  });
  res.json({ task: task ? mapTaskWithHotlists(task) : null });
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

