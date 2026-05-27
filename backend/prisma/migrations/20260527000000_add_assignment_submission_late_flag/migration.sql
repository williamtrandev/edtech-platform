ALTER TABLE "AssignmentSubmission"
ADD COLUMN "isLate" BOOLEAN NOT NULL DEFAULT false;

UPDATE "AssignmentSubmission" AS "submission"
SET "isLate" = true
FROM "Assignment" AS "assignment"
WHERE "submission"."assignmentId" = "assignment"."id"
  AND "assignment"."dueAt" IS NOT NULL
  AND "submission"."submittedAt" > "assignment"."dueAt";
