-- AlterEnum
ALTER TYPE "ExamQuestionType" ADD VALUE 'CODE';

-- AlterTable
ALTER TABLE "ExamQuestion" ADD COLUMN "codeConfig" JSONB;
