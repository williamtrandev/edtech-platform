import { ExamAttemptStatus, ExamQuestionType, Prisma } from "@prisma/client";
import { EXAM_QUESTION_TYPE } from "../../common/constants/business";
import { ExamAttemptRepository } from "./exam-attempt.repository";

type GradingQuestion = {
  id: string;
  type: ExamQuestionType;
  points: number;
  correctAnswers: Prisma.JsonValue | null;
};

type GradingAnswer = {
  questionId: string;
  answer: Prisma.JsonValue | null;
};

function normalizeAnswerIds(answer: Prisma.JsonValue | null): string[] {
  if (answer === null || answer === undefined) {
    return [];
  }

  if (Array.isArray(answer)) {
    return answer.map((item) => String(item).trim().toUpperCase()).filter(Boolean);
  }

  const value = String(answer).trim().toUpperCase();
  return value ? [value] : [];
}

function normalizeCorrectAnswers(correctAnswers: Prisma.JsonValue | null): string[] {
  if (!correctAnswers) {
    return [];
  }

  if (Array.isArray(correctAnswers)) {
    return correctAnswers.map((item) => String(item).trim().toUpperCase()).filter(Boolean);
  }

  const value = String(correctAnswers).trim().toUpperCase();
  return value ? [value] : [];
}

function isObjectiveAnswerCorrect(type: ExamQuestionType, answer: Prisma.JsonValue | null, correctAnswers: Prisma.JsonValue | null) {
  const userAnswers = normalizeAnswerIds(answer);
  const expected = normalizeCorrectAnswers(correctAnswers);

  if (!expected.length || !userAnswers.length) {
    return false;
  }

  if (type === EXAM_QUESTION_TYPE.singleChoice) {
    return userAnswers[0] === expected[0];
  }

  if (type === EXAM_QUESTION_TYPE.multipleChoice) {
    if (userAnswers.length !== expected.length) {
      return false;
    }

    const sortedUser = [...userAnswers].sort();
    const sortedExpected = [...expected].sort();
    return sortedUser.every((value, index) => value === sortedExpected[index]);
  }

  return false;
}

export class ExamGradingService {
  constructor(private readonly examAttemptRepository: ExamAttemptRepository) {}

  async gradeAttempt(attemptId: string) {
    const gradingContext = await this.examAttemptRepository.findAttemptForGrading(attemptId);
    if (!gradingContext) {
      return null;
    }

    if (gradingContext.status !== ExamAttemptStatus.SUBMITTED) {
      return gradingContext;
    }

    const answerByQuestionId = new Map(gradingContext.answers.map((item) => [item.questionId, item.answer]));
    let earnedPoints = 0;
    let totalPoints = 0;
    let hasFreeText = false;

    for (const question of gradingContext.exam.questions as GradingQuestion[]) {
      totalPoints += question.points;

      if (question.type === EXAM_QUESTION_TYPE.freeText) {
        hasFreeText = true;
        continue;
      }

      const answer = answerByQuestionId.get(question.id) ?? null;
      if (isObjectiveAnswerCorrect(question.type, answer, question.correctAnswers)) {
        earnedPoints += question.points;
      }
    }

    if (hasFreeText) {
      return gradingContext;
    }

    const score = totalPoints === 0 ? 0 : Math.round((earnedPoints / totalPoints) * 100);
    return this.examAttemptRepository.markAttemptGraded(attemptId, score);
  }
}
