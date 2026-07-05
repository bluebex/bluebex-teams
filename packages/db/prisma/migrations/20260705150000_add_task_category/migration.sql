-- CreateEnum
CREATE TYPE "TaskCategory" AS ENUM ('TASK', 'BUG');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "category" "TaskCategory" NOT NULL DEFAULT 'TASK';
