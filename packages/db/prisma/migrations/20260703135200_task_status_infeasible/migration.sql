-- Replace BLOCKED with INFEASIBLE in TaskStatus enum
CREATE TYPE "TaskStatus_new" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'INFEASIBLE');

ALTER TABLE "Task" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "status" TYPE "TaskStatus_new" USING (
  CASE "status"::text
    WHEN 'BLOCKED' THEN 'INFEASIBLE'::"TaskStatus_new"
    ELSE "status"::text::"TaskStatus_new"
  END
);
ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'TODO'::"TaskStatus_new";

ALTER TABLE "TaskStatusLog" ALTER COLUMN "fromStatus" TYPE "TaskStatus_new" USING (
  CASE
    WHEN "fromStatus" IS NULL THEN NULL
    WHEN "fromStatus"::text = 'BLOCKED' THEN 'INFEASIBLE'::"TaskStatus_new"
    ELSE "fromStatus"::text::"TaskStatus_new"
  END
);

ALTER TABLE "TaskStatusLog" ALTER COLUMN "toStatus" TYPE "TaskStatus_new" USING (
  CASE "toStatus"::text
    WHEN 'BLOCKED' THEN 'INFEASIBLE'::"TaskStatus_new"
    ELSE "toStatus"::text::"TaskStatus_new"
  END
);

DROP TYPE "TaskStatus";
ALTER TYPE "TaskStatus_new" RENAME TO "TaskStatus";
