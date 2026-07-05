-- AlterEnum
CREATE TYPE "TaskStatus_new" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'INFEASIBLE');

ALTER TABLE "Task" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "status" TYPE "TaskStatus_new" USING ("status"::text::"TaskStatus_new");
ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'TODO'::"TaskStatus_new";

ALTER TABLE "TaskStatusLog" ALTER COLUMN "fromStatus" TYPE "TaskStatus_new" USING (
  CASE
    WHEN "fromStatus" IS NULL THEN NULL
    ELSE "fromStatus"::text::"TaskStatus_new"
  END
);

ALTER TABLE "TaskStatusLog" ALTER COLUMN "toStatus" TYPE "TaskStatus_new" USING ("toStatus"::text::"TaskStatus_new");

DROP TYPE "TaskStatus";
ALTER TYPE "TaskStatus_new" RENAME TO "TaskStatus";
