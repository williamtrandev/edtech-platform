-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Lesson_courseId_archivedAt_idx" ON "Lesson"("courseId", "archivedAt");
