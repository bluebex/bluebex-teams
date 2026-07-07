-- Replace INFEASIBLE with expanded Won't Fix statuses
DROP TYPE IF EXISTS "TaskStatus_new";

CREATE TYPE "TaskStatus_new" AS ENUM (
  'TODO',
  'IN_PROGRESS',
  'DONE',
  'WONT_FIX_INFEASIBLE',
  'WONT_FIX_OBSOLETE'
);

ALTER TABLE "Task" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "status" TYPE "TaskStatus_new" USING (
  CASE "status"::text
    WHEN 'INFEASIBLE' THEN 'WONT_FIX_INFEASIBLE'::"TaskStatus_new"
    ELSE "status"::text::"TaskStatus_new"
  END
);
ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'TODO'::"TaskStatus_new";

ALTER TABLE "TaskStatusLog" ALTER COLUMN "fromStatus" TYPE "TaskStatus_new" USING (
  CASE
    WHEN "fromStatus" IS NULL THEN NULL
    WHEN "fromStatus"::text = 'INFEASIBLE' THEN 'WONT_FIX_INFEASIBLE'::"TaskStatus_new"
    WHEN "fromStatus"::text = 'BLOCKED' THEN 'WONT_FIX_INFEASIBLE'::"TaskStatus_new"
    ELSE "fromStatus"::text::"TaskStatus_new"
  END
);

ALTER TABLE "TaskStatusLog" ALTER COLUMN "toStatus" TYPE "TaskStatus_new" USING (
  CASE "toStatus"::text
    WHEN 'INFEASIBLE' THEN 'WONT_FIX_INFEASIBLE'::"TaskStatus_new"
    WHEN 'BLOCKED' THEN 'WONT_FIX_INFEASIBLE'::"TaskStatus_new"
    ELSE "toStatus"::text::"TaskStatus_new"
  END
);

DROP TYPE "TaskStatus";
ALTER TYPE "TaskStatus_new" RENAME TO "TaskStatus";
