import { ExamAttemptStatus, ExamQuestionType, Prisma } from "@prisma/client";
import { EXAM_QUESTION_TYPE } from "../../common/constants/business";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, AUDIT_GRADING_SOURCE } from "../../common/constants/audit";
import { env } from "../../config/env";
import { AuditRepository } from "../audit/audit.repository";
import { CodeGradingService, type CodeTest } from "../code-execution/code-grading.service";
import { CertificateEligibilityService } from "../progress/certificate-eligibility.service";
import { NotificationService } from "../notification/notification.service";
import { ExamAttemptRepository } from "./exam-attempt.repository";

type GradingQuestion = {
  id: string;
  type: ExamQuestionType;
  points: number;
  correctAnswers: Prisma.JsonValue | null;
  codeConfig: Prisma.JsonValue | null;
};

type CodeSecret = { solutionCode?: string; tests?: CodeTest[] };
type CodeConfig = { language?: string };

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
  constructor(
    private readonly examAttemptRepository: ExamAttemptRepository,
    private readonly notificationService?: NotificationService,
    private readonly certificateEligibilityService?: CertificateEligibilityService,
    private readonly auditRepository?: AuditRepository,
    private readonly codeGradingService?: CodeGradingService
  ) {}

  async gradeAttempt(attemptId: string) {
    const gradingContext = await this.examAttemptRepository.findAttemptForGrading(attemptId);
    if (!gradingContext) {
      return null;
    }

    if (gradingContext.status !== ExamAttemptStatus.SUBMITTED) {
      return gradingContext;
    }

    const answerByQuestionId = new Map(gradingContext.answers.map((item) => [item.questionId, item.answer]));
    const answeredQuestionIds = new Set(gradingContext.answers.map((item) => item.questionId));
    let earnedPoints = 0;
    let totalPoints = 0;
    let needsManual = false;

    for (const question of gradingContext.exam.questions as GradingQuestion[]) {
      totalPoints += question.points;

      // FREE_TEXT has no auto-grader: the whole attempt waits for manual grading.
      if (question.type === EXAM_QUESTION_TYPE.freeText) {
        needsManual = true;
        continue;
      }

      // CODE runs the learner's source against the question's tests in the sandbox.
      // A null grade (disabled, unsupported language, or infra failure) falls back
      // to manual rather than scoring the learner zero for an outage.
      if (question.type === EXAM_QUESTION_TYPE.code) {
        const grade = env.CODE_EXECUTION_ENABLED
          ? await this.gradeCodeQuestion(question, answerByQuestionId.get(question.id) ?? null)
          : null;
        if (!grade) {
          needsManual = true;
          continue;
        }
        // Persist per-test feedback so the learner sees which tests passed.
        if (answeredQuestionIds.has(question.id)) {
          await this.examAttemptRepository.setAnswerGradingResult(attemptId, question.id, {
            total: grade.total,
            passed: grade.passed,
            allPassed: grade.allPassed,
            results: grade.results
          });
        }
        earnedPoints += Math.round((grade.passed / grade.total) * question.points);
        continue;
      }

      const answer = answerByQuestionId.get(question.id) ?? null;
      if (isObjectiveAnswerCorrect(question.type, answer, question.correctAnswers)) {
        earnedPoints += question.points;
      }
    }

    if (needsManual) {
      return gradingContext;
    }

    const score = totalPoints === 0 ? 0 : Math.round((earnedPoints / totalPoints) * 100);
    const gradedAttempt = await this.examAttemptRepository.markAttemptGraded(attemptId, score);
    await this.auditRepository?.create({
      action: AUDIT_ACTION.examAttemptAutoGraded,
      entityType: AUDIT_ENTITY_TYPE.examAttempt,
      entityId: attemptId,
      metadata: {
        courseId: gradingContext.exam.courseId,
        examId: gradingContext.examId,
        userId: gradingContext.userId,
        attemptNumber: gradingContext.attemptNumber,
        gradingSource: AUDIT_GRADING_SOURCE.auto,
        before: {
          status: gradingContext.status,
          score: gradingContext.score
        },
        after: {
          status: gradedAttempt.status,
          score: gradedAttempt.score
        }
      }
    });
    await this.notificationService?.createNotification({
      userId: gradingContext.userId,
      type: "SYSTEM",
      title: "Exam graded",
      body: `Your exam was graded. Score: ${gradedAttempt.score ?? score}.`,
      linkUrl: "/my-progress",
      metadata: {
        examId: gradingContext.examId,
        attemptId: gradedAttempt.id,
        score: gradedAttempt.score
      }
    });

    const courseId = gradingContext.exam.courseId;
    if (courseId) {
      await this.certificateEligibilityService?.tryIssueCertificateIfEligible(gradingContext.userId, courseId);
    }

    return gradedAttempt;
  }

  /** Runs a CODE question's tests against the learner's submitted source. */
  private async gradeCodeQuestion(question: GradingQuestion, answer: Prisma.JsonValue | null) {
    if (!this.codeGradingService) {
      return null;
    }
    const config = question.codeConfig as CodeConfig | null;
    const secret = question.correctAnswers as CodeSecret | null;
    if (!config?.language || !secret?.tests?.length) {
      return null;
    }
    const code = typeof answer === "string" ? answer : "";
    return this.codeGradingService.gradeCodeQuestion({ language: config.language, code, tests: secret.tests });
  }
}
