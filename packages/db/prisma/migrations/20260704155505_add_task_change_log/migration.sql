-- CreateTable
CREATE TABLE "TaskChangeLog" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskChangeLog_taskId_idx" ON "TaskChangeLog"("taskId");

-- CreateIndex
CREATE INDEX "TaskChangeLog_userId_idx" ON "TaskChangeLog"("userId");

-- AddForeignKey
ALTER TABLE "TaskChangeLog" ADD CONSTRAINT "TaskChangeLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskChangeLog" ADD CONSTRAINT "TaskChangeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
