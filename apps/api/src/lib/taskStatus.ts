import { TaskStatus } from "@prisma/client";

export const CLOSED_TASK_STATUSES: TaskStatus[] = [
  TaskStatus.DONE,
  TaskStatus.WONT_FIX_INFEASIBLE,
  TaskStatus.WONT_FIX_OBSOLETE,
];
