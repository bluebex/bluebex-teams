import { prisma } from "@bluebex/db";

export async function canAccessProcess(userId: string, processId: string) {
  const process = await prisma.process.findUnique({
    where: { id: processId },
    select: { projectId: true },
  });
  if (!process) return { ok: false as const, reason: "Process not found" };

  const [projectMember, processMember] = await Promise.all([
    prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: process.projectId, userId } },
      select: { userId: true },
    }),
    prisma.processMember.findUnique({
      where: { processId_userId: { processId, userId } },
      select: { userId: true },
    }),
  ]);

  const ok = Boolean(projectMember || processMember);
  return ok
    ? { ok: true as const, projectId: process.projectId }
    : { ok: false as const, reason: "Not a member of project/process" };
}

export async function accessibleProcessIds(userId: string) {
  const [projectMemberships, processMemberships] = await Promise.all([
    prisma.projectMember.findMany({ where: { userId }, select: { projectId: true } }),
    prisma.processMember.findMany({
      where: { userId },
      select: { processId: true, process: { select: { projectId: true } } },
    }),
  ]);

  const projectIds = new Set(projectMemberships.map((m: { projectId: string }) => m.projectId));
  const directProcessIds = new Set(processMemberships.map((m: { processId: string }) => m.processId));

  if (projectIds.size === 0 && directProcessIds.size === 0) return [];

  const processes = await prisma.process.findMany({
    where: {
      OR: [
        { id: { in: [...directProcessIds] } },
        { projectId: { in: [...projectIds] } },
      ],
    },
    select: { id: true },
  });
  return processes.map((p: { id: string }) => p.id);
}

export async function accessibleProjectsWithProcesses(userId: string) {
  const processIds = await accessibleProcessIds(userId);
  if (processIds.length === 0) return [];

  const processes = await prisma.process.findMany({
    where: { id: { in: processIds } },
    select: {
      id: true,
      name: true,
      projectId: true,
      project: { select: { id: true, name: true } },
    },
    orderBy: [{ project: { name: "asc" } }, { name: "asc" }],
  });

  const byProject = new Map<
    string,
    { id: string; name: string; processes: { id: string; name: string }[] }
  >();
  for (const process of processes) {
    if (!byProject.has(process.projectId)) {
      byProject.set(process.projectId, {
        id: process.project.id,
        name: process.project.name,
        processes: [],
      });
    }
    byProject.get(process.projectId)!.processes.push({ id: process.id, name: process.name });
  }
  return [...byProject.values()];
}

export async function canUserBeAssignedToProcess(userId: string, processId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user || user.role !== "USER") return false;

  const process = await prisma.process.findUnique({
    where: { id: processId },
    select: { projectId: true },
  });
  if (!process) return false;

  const [projectMember, processMember] = await Promise.all([
    prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: process.projectId, userId } },
      select: { userId: true },
    }),
    prisma.processMember.findUnique({
      where: { processId_userId: { processId, userId } },
      select: { userId: true },
    }),
  ]);

  return Boolean(projectMember || processMember);
}

export async function assignableUsersForProcesses(processIds: string[]) {
  if (processIds.length === 0) return [];

  const processes = await prisma.process.findMany({
    where: { id: { in: processIds } },
    select: { id: true, projectId: true },
  });
  if (processes.length === 0) return [];

  const projectIds = [...new Set(processes.map((p) => p.projectId))];
  const scopedProcessIds = processes.map((p) => p.id);

  const [projectMembers, processMembers] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId: { in: projectIds } },
      select: { userId: true },
    }),
    prisma.processMember.findMany({
      where: { processId: { in: scopedProcessIds } },
      select: { userId: true },
    }),
  ]);

  const userIds = [
    ...new Set([
      ...projectMembers.map((m) => m.userId),
      ...processMembers.map((m) => m.userId),
    ]),
  ];
  if (userIds.length === 0) return [];

  return prisma.user.findMany({
    where: { id: { in: userIds }, role: "USER" },
    orderBy: { name: "asc" },
    select: { id: true, username: true, name: true },
  });
}

/** Hotlists that have at least one task in the user's accessible processes. */
export async function accessibleHotlists(userId: string) {
  const processIds = await accessibleProcessIds(userId);
  if (processIds.length === 0) return [];

  const hotlists = await prisma.hotlist.findMany({
    where: {
      taskLinks: {
        some: {
          task: { processId: { in: processIds } },
        },
      },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      hotlistId: true,
      name: true,
      taskLinks: {
        where: { task: { processId: { in: processIds } } },
        select: { taskId: true },
      },
    },
  });

  return hotlists.map(({ taskLinks, ...hotlist }) => ({
    ...hotlist,
    taskCount: taskLinks.length,
  }));
}

