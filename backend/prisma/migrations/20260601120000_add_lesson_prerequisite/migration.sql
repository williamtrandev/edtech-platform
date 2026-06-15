-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN "prerequisiteLessonId" TEXT;

-- CreateIndex
CREATE INDEX "Lesson_prerequisiteLessonId_idx" ON "Lesson"("prerequisiteLessonId");

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_prerequisiteLessonId_fkey" FOREIGN KEY ("prerequisiteLessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
