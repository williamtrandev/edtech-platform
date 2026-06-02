-- CreateTable
CREATE TABLE "CourseDiscussionComment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseDiscussionComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseDiscussionComment_courseId_lessonId_idx" ON "CourseDiscussionComment"("courseId", "lessonId");

-- CreateIndex
CREATE INDEX "CourseDiscussionComment_parentId_idx" ON "CourseDiscussionComment"("parentId");

-- CreateIndex
CREATE INDEX "CourseDiscussionComment_userId_idx" ON "CourseDiscussionComment"("userId");

-- AddForeignKey
ALTER TABLE "CourseDiscussionComment" ADD CONSTRAINT "CourseDiscussionComment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseDiscussionComment" ADD CONSTRAINT "CourseDiscussionComment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseDiscussionComment" ADD CONSTRAINT "CourseDiscussionComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseDiscussionComment" ADD CONSTRAINT "CourseDiscussionComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CourseDiscussionComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
