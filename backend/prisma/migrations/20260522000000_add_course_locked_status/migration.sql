-- AlterEnum
ALTER TYPE "CourseStatus" ADD VALUE 'LOCKED';

-- AlterTable
ALTER TABLE "Course" ADD COLUMN "lockReason" TEXT,
ADD COLUMN "lockedAt" TIMESTAMP(3),
ADD COLUMN "lockedById" TEXT,
ADD COLUMN "statusBeforeLock" "CourseStatus";

-- CreateIndex
CREATE INDEX "Course_lockedById_idx" ON "Course"("lockedById");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
