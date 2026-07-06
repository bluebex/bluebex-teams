import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@bluebex/db";
import { Prisma } from "@prisma/client";
import { requireAdmin, type AuthedRequest } from "../lib/auth.js";
import { formatFullName } from "../lib/format.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, username: true, name: true, role: true, createdAt: true },
  });
  res.json({ users });
});

adminRouter.post("/users", async (req, res) => {
  const body = z
    .object({
      username: z.string().min(3),
      password: z.string().min(6),
      name: z.string().min(1),
    })
    .parse(req.body);

  const existing = await prisma.user.findUnique({ where: { username: body.username } });
  if (existing) {
    return res.status(409).json({ error: "User already exists" });
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  try {
    const user = await prisma.user.create({
      data: { username: body.username, name: formatFullName(body.name), passwordHash, role: "USER" },
      select: { id: true, username: true, name: true, role: true, createdAt: true },
    });
    return res.json({ user });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return res.status(409).json({ error: "User already exists" });
    }
    throw e;
  }
});

adminRouter.patch("/users/:userId", async (req, res) => {
  const userId = z.string().parse(req.params.userId);
  const body = z
    .object({
      username: z.string().min(3),
      name: z.string().min(1),
      password: z.string().min(6).optional(),
    })
    .parse(req.body);

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) return res.status(404).json({ error: "User not found" });

  const usernameTaken = await prisma.user.findFirst({
    where: { username: body.username, NOT: { id: userId } },
  });
  if (usernameTaken) {
    return res.status(409).json({ error: "User already exists" });
  }

  const data: { username: string; name: string; passwordHash?: string } = {
    username: body.username,
    name: formatFullName(body.name),
  };
  if (body.password) {
    data.passwordHash = await bcrypt.hash(body.password, 10);
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, username: true, name: true, role: true, createdAt: true },
    });
    return res.json({ user });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return res.status(409).json({ error: "User already exists" });
    }
    throw e;
  }
});

adminRouter.delete("/users/:userId", async (req: AuthedRequest, res) => {
  const userId = z.string().parse(req.params.userId);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: "User not found" });

  if (req.user?.id === userId) {
    return res.status(400).json({ error: "You cannot delete your own account" });
  }

  if (user.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return res.status(400).json({ error: "Cannot delete the last admin" });
    }
  }

  const [createdTasks, comments, statusLogs] = await Promise.all([
    prisma.task.count({ where: { createdById: userId } }),
    prisma.comment.count({ where: { userId } }),
    prisma.taskStatusLog.count({ where: { userId } }),
  ]);

  if (createdTasks > 0 || comments > 0 || statusLogs > 0) {
    return res.status(409).json({
      error: "Cannot delete user with existing tasks, comments, or activity",
    });
  }

  await prisma.user.delete({ where: { id: userId } });
  res.json({ ok: true });
});

adminRouter.get("/projects", async (_req, res) => {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      processes: { orderBy: { name: "asc" } },
      members: { include: { user: { select: { id: true, name: true, username: true } } } },
      _count: { select: { tasks: true } },
    },
  });
  res.json({ projects });
});

adminRouter.post("/projects", async (req, res) => {
  const body = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    memberIds: z.array(z.string()).optional(),
  }).parse(req.body);

  const project = await prisma.$transaction(async (tx: any) => {
    const p = await tx.project.create({
      data: { name: body.name, description: body.description },
    });
    if (body.memberIds?.length) {
      await tx.projectMember.createMany({
        data: body.memberIds.map((userId: string) => ({ projectId: p.id, userId })),
        skipDuplicates: true,
      });
    }
    return tx.project.findUnique({
      where: { id: p.id },
      include: {
        processes: { orderBy: { name: "asc" } },
        members: { include: { user: { select: { id: true, name: true, username: true } } } },
      },
    });
  });
  res.json({ project });
});

adminRouter.get("/projects/:projectId", async (req, res) => {
  const projectId = z.string().parse(req.params.projectId);
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      processes: {
        orderBy: { name: "asc" },
        include: {
          members: { include: { user: { select: { id: true, name: true, username: true } } } },
          _count: { select: { tasks: true } },
        },
      },
      members: { include: { user: { select: { id: true, name: true, username: true } } } },
      _count: { select: { tasks: true } },
    },
  });
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json({ project });
});

adminRouter.patch("/projects/:projectId", async (req, res) => {
  const projectId = z.string().parse(req.params.projectId);
  const body = z.object({
    name: z.string().min(2).optional(),
    description: z.string().nullable().optional(),
  }).parse(req.body);

  const existing = await prisma.project.findUnique({ where: { id: projectId } });
  if (!existing) return res.status(404).json({ error: "Project not found" });

  try {
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
      },
      include: {
        processes: { orderBy: { name: "asc" } },
        members: { include: { user: { select: { id: true, name: true, username: true } } } },
      },
    });
    return res.json({ project });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return res.status(409).json({ error: "A project with this name already exists" });
    }
    throw e;
  }
});

adminRouter.delete("/projects/:projectId", async (req, res) => {
  const projectId = z.string().parse(req.params.projectId);

  const existing = await prisma.project.findUnique({ where: { id: projectId } });
  if (!existing) return res.status(404).json({ error: "Project not found" });

  const taskCount = await prisma.task.count({ where: { projectId } });
  if (taskCount > 0) {
    return res.status(409).json({ error: "Cannot delete project with existing tasks" });
  }

  await prisma.project.delete({ where: { id: projectId } });
  res.json({ ok: true });
});

adminRouter.post("/projects/:projectId/processes", async (req, res) => {
  const body = z.object({ name: z.string().min(1) }).parse(req.body);
  const projectId = z.string().parse(req.params.projectId);
  const process = await prisma.process.create({ data: { name: body.name, projectId } });
  res.json({ process });
});

adminRouter.patch("/projects/:projectId/processes/:processId", async (req, res) => {
  const projectId = z.string().parse(req.params.projectId);
  const processId = z.string().parse(req.params.processId);
  const body = z.object({ name: z.string().min(1) }).parse(req.body);

  const existing = await prisma.process.findFirst({ where: { id: processId, projectId } });
  if (!existing) return res.status(404).json({ error: "Process not found" });

  try {
    const process = await prisma.process.update({
      where: { id: processId },
      data: { name: body.name },
    });
    return res.json({ process });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return res.status(409).json({
        error: "A process with this name already exists in this project",
      });
    }
    throw e;
  }
});

adminRouter.delete("/projects/:projectId/processes/:processId", async (req, res) => {
  const projectId = z.string().parse(req.params.projectId);
  const processId = z.string().parse(req.params.processId);

  const existing = await prisma.process.findFirst({ where: { id: processId, projectId } });
  if (!existing) return res.status(404).json({ error: "Process not found" });

  const taskCount = await prisma.task.count({ where: { processId } });
  if (taskCount > 0) {
    return res.status(409).json({ error: "Cannot delete process with existing tasks" });
  }

  await prisma.process.delete({ where: { id: processId } });
  res.json({ ok: true });
});

adminRouter.post("/memberships/project", async (req, res) => {
  const body = z.object({ userId: z.string().min(1), projectId: z.string().min(1) }).parse(req.body);

  const membership = await prisma.$transaction(async (tx: any) => {
    const created = await tx.projectMember.upsert({
      where: { projectId_userId: { projectId: body.projectId, userId: body.userId } },
      update: {},
      create: { projectId: body.projectId, userId: body.userId },
    });

    await tx.processMember.deleteMany({
      where: {
        userId: body.userId,
        process: { projectId: body.projectId },
      },
    });

    return created;
  });

  res.json({ membership });
});

adminRouter.post("/memberships/process", async (req, res) => {
  const body = z.object({ userId: z.string().min(1), processId: z.string().min(1) }).parse(req.body);

  const process = await prisma.process.findUnique({
    where: { id: body.processId },
    select: { projectId: true },
  });
  if (!process) return res.status(404).json({ error: "Process not found" });

  const projectMember = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: process.projectId, userId: body.userId } },
  });
  if (projectMember) {
    return res.status(409).json({
      error: "User already has access to all processes in this project",
    });
  }

  const membership = await prisma.processMember.upsert({
    where: { processId_userId: { processId: body.processId, userId: body.userId } },
    update: {},
    create: { processId: body.processId, userId: body.userId },
  });
  res.json({ membership });
});

adminRouter.post("/memberships/process/batch", async (req, res) => {
  const body = z
    .object({
      userId: z.string().min(1),
      processIds: z.array(z.string().min(1)).min(1).max(50),
    })
    .parse(req.body);

  const processes = await prisma.process.findMany({
    where: { id: { in: body.processIds } },
    select: { id: true, projectId: true },
  });
  if (processes.length !== body.processIds.length) {
    return res.status(404).json({ error: "One or more processes not found" });
  }

  const projectIds = [...new Set(processes.map((process: any) => process.projectId))];
  if (projectIds.length !== 1) {
    return res.status(400).json({ error: "All processes must belong to the same project" });
  }

  const projectId = projectIds[0]!;
  const projectMember = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: body.userId } },
  });
  if (projectMember) {
    return res.status(409).json({
      error: "User already has access to all processes in this project",
    });
  }

  const memberships = await prisma.$transaction(
    body.processIds.map((processId) =>
      prisma.processMember.upsert({
        where: { processId_userId: { processId, userId: body.userId } },
        update: {},
        create: { processId, userId: body.userId },
      }),
    ),
  );

  res.json({ memberships, count: memberships.length });
});

adminRouter.get("/memberships", async (_req, res) => {
  const [projectMemberships, processMemberships] = await Promise.all([
    prisma.projectMember.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, username: true } },
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.processMember.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, username: true } },
        process: {
          select: {
            id: true,
            name: true,
            project: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  const projectAccessKeys = new Set(
    projectMemberships.map((m: any) => `${m.userId}:${m.projectId}`),
  );

  res.json({
    projectMemberships: projectMemberships.map((m: any) => ({
      userId: m.userId,
      userName: m.user.name,
      username: m.user.username,
      projectId: m.projectId,
      projectName: m.project.name,
      createdAt: m.createdAt,
    })),
    processMemberships: processMemberships
      .filter((m: any) => !projectAccessKeys.has(`${m.userId}:${m.process.project.id}`))
      .map((m: any) => ({
        userId: m.userId,
        userName: m.user.name,
        username: m.user.username,
        processId: m.processId,
        processName: m.process.name,
        projectId: m.process.project.id,
        projectName: m.process.project.name,
        createdAt: m.createdAt,
      })),
  });
});

adminRouter.delete("/memberships/project/:projectId/users/:userId", async (req, res) => {
  const projectId = z.string().parse(req.params.projectId);
  const userId = z.string().parse(req.params.userId);

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!existing) return res.status(404).json({ error: "Project access not found" });

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId } },
  });
  res.json({ ok: true });
});

adminRouter.delete("/memberships/process/:processId/users/:userId", async (req, res) => {
  const processId = z.string().parse(req.params.processId);
  const userId = z.string().parse(req.params.userId);

  const existing = await prisma.processMember.findUnique({
    where: { processId_userId: { processId, userId } },
  });
  if (!existing) return res.status(404).json({ error: "Project access not found" });

  await prisma.processMember.delete({
    where: { processId_userId: { processId, userId } },
  });
  res.json({ ok: true });
});

adminRouter.get("/projects/:projectId/tasks", async (req, res) => {
  const projectId = z.string().parse(req.params.projectId);
  const tasks = await prisma.task.findMany({
    where: { projectId },
    orderBy: { updatedAt: "desc" },
    include: {
      createdBy: { select: { id: true, username: true, name: true } },
      assignedTo: { select: { id: true, username: true, name: true } },
      process: { select: { id: true, name: true } },
    },
  });
  res.json({ tasks });
});

adminRouter.delete("/tasks/:taskId", async (req, res) => {
  const taskId = z.string().parse(req.params.taskId);
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ error: "Task not found" });

  await prisma.$transaction([
    prisma.comment.deleteMany({ where: { taskId } }),
    prisma.taskStatusLog.deleteMany({ where: { taskId } }),
    prisma.taskChangeLog.deleteMany({ where: { taskId } }),
    prisma.task.delete({ where: { id: taskId } }),
  ]);
  res.json({ ok: true });
});

adminRouter.get("/hotlists", async (_req, res) => {
  const hotlists = await prisma.hotlist.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      hotlistId: true,
      name: true,
      createdAt: true,
      createdBy: { select: { id: true, username: true, name: true } },
      _count: { select: { taskLinks: true } },
    },
  });
  res.json({ hotlists });
});

adminRouter.delete("/hotlists/:hotlistId", async (req: AuthedRequest, res) => {
  const hotlistId = z.string().trim().min(1).parse(req.params.hotlistId);

  const existing = await prisma.hotlist.findUnique({
    where: { hotlistId },
    select: { id: true },
  });
  if (!existing) return res.status(404).json({ error: "Hotlist not found" });

  await prisma.hotlist.delete({ where: { hotlistId } });
  res.json({ ok: true });
});

