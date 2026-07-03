-- Add taskNumber column to Task
ALTER TABLE "Task" ADD COLUMN "taskNumber" INTEGER;

-- Backfill existing tasks with sequential 7-digit numbers
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") + 1000000 AS num
  FROM "Task"
)
UPDATE "Task" SET "taskNumber" = numbered.num
FROM numbered WHERE "Task".id = numbered.id;

-- Make it non-nullable and unique
ALTER TABLE "Task" ALTER COLUMN "taskNumber" SET NOT NULL;
CREATE UNIQUE INDEX "Task_taskNumber_key" ON "Task"("taskNumber");
