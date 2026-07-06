-- CreateTable
CREATE TABLE "Hotlist" (
    "id" TEXT NOT NULL,
    "hotlistId" VARCHAR(6) NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hotlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskHotlist" (
    "taskId" TEXT NOT NULL,
    "hotlistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskHotlist_pkey" PRIMARY KEY ("taskId","hotlistId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hotlist_hotlistId_key" ON "Hotlist"("hotlistId");

-- CreateIndex
CREATE INDEX "Hotlist_createdById_idx" ON "Hotlist"("createdById");

-- CreateIndex
CREATE INDEX "TaskHotlist_hotlistId_idx" ON "TaskHotlist"("hotlistId");

-- AddForeignKey
ALTER TABLE "Hotlist" ADD CONSTRAINT "Hotlist_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskHotlist" ADD CONSTRAINT "TaskHotlist_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskHotlist" ADD CONSTRAINT "TaskHotlist_hotlistId_fkey" FOREIGN KEY ("hotlistId") REFERENCES "Hotlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
