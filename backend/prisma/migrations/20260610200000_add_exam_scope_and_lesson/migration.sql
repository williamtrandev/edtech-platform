-- CreateEnum
CREATE TYPE "ExamScope" AS ENUM ('LESSON', 'COURSE');

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN "lessonId" TEXT,
ADD COLUMN "scope" "ExamScope" NOT NULL DEFAULT 'COURSE';

-- CreateIndex
CREATE INDEX "Exam_lessonId_idx" ON "Exam"("lessonId");

-- CreateIndex
CREATE INDEX "Exam_courseId_scope_idx" ON "Exam"("courseId", "scope");

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
