-- CreateTable
CREATE TABLE "AssignmentRubricCriterion" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "maxPoints" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentRubricCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentRubricScore" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentRubricScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssignmentRubricCriterion_assignmentId_idx" ON "AssignmentRubricCriterion"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentRubricCriterion_assignmentId_sortOrder_key" ON "AssignmentRubricCriterion"("assignmentId", "sortOrder");

-- CreateIndex
CREATE INDEX "AssignmentRubricScore_submissionId_idx" ON "AssignmentRubricScore"("submissionId");

-- CreateIndex
CREATE INDEX "AssignmentRubricScore_criterionId_idx" ON "AssignmentRubricScore"("criterionId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentRubricScore_submissionId_criterionId_key" ON "AssignmentRubricScore"("submissionId", "criterionId");

-- AddForeignKey
ALTER TABLE "AssignmentRubricCriterion" ADD CONSTRAINT "AssignmentRubricCriterion_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentRubricScore" ADD CONSTRAINT "AssignmentRubricScore_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AssignmentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentRubricScore" ADD CONSTRAINT "AssignmentRubricScore_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "AssignmentRubricCriterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
