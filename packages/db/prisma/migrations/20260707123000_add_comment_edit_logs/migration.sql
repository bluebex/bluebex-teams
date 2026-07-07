-- AlterTable
ALTER TABLE "Comment" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "CommentEditLog" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromBody" TEXT NOT NULL,
    "toBody" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentEditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommentEditLog_commentId_idx" ON "CommentEditLog"("commentId");

-- AddForeignKey
ALTER TABLE "CommentEditLog" ADD CONSTRAINT "CommentEditLog_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentEditLog" ADD CONSTRAINT "CommentEditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
