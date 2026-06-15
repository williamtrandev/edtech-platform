-- CreateEnum
CREATE TYPE "ExamAttemptEventType" AS ENUM ('TAB_HIDDEN', 'TAB_VISIBLE', 'WINDOW_BLUR', 'WINDOW_FOCUS', 'RECONNECT', 'TIMER_EXPIRED', 'MANUAL_SUBMIT');

-- CreateTable
CREATE TABLE "ExamAttemptIntegrityEvent" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "type" "ExamAttemptEventType" NOT NULL,
    "clientEventId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamAttemptIntegrityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamAttemptIntegrityEvent_attemptId_idx" ON "ExamAttemptIntegrityEvent"("attemptId");

-- CreateIndex
CREATE INDEX "ExamAttemptIntegrityEvent_attemptId_type_idx" ON "ExamAttemptIntegrityEvent"("attemptId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ExamAttemptIntegrityEvent_attemptId_clientEventId_key" ON "ExamAttemptIntegrityEvent"("attemptId", "clientEventId");

-- AddForeignKey
ALTER TABLE "ExamAttemptIntegrityEvent" ADD CONSTRAINT "ExamAttemptIntegrityEvent_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
