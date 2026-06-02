import { ExamAttemptEventType, ExamAttemptStatus, ExamStatus, Prisma } from "@prisma/client";
import { redisConnection } from "../../config/redis";
import { COURSE_STATUS, USER_ROLE } from "../../common/constants/business";
import {
  EXAM_ATTEMPT_EVENT_TYPE,
  EXAM_SUBMIT_REASON,
  type ExamSubmitReason
} from "../../common/constants/exam-integrity";
import { AppError } from "../../common/errors/app-error";
import { assertCourseInstructor } from "../../common/auth/course-access";
import { examGradingQueue } from "../../jobs/exam-grading.queue";
import { AuditRepository } from "../audit/audit.repository";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { CertificateEligibilityService } from "../progress/certificate-eligibility.service";
import { NotificationService } from "../notification/notification.service";
import { ExamAttemptIntegrityRepository } from "./exam-attempt-integrity.repository";
import { ExamAttemptRepository, type SubmitExamAnswerInput } from "./exam-attempt.repository";

type SubmitExamAttemptPayload = {
  answers: Array<{
    questionId: string;
    answer: string | string[] | null;
  }>;
  submitReason?: ExamSubmitReason;
};

type RecordIntegrityEventsPayload = {
  events: Array<{
    type: ExamAttemptEventType;
    clientEventId?: string;
    metadata?: Record<string, unknown>;
  }>;
};

type SaveExamAnswersPayload = {
  answers: Array<{
    questionId: string;
    answer: string | string[] | null;
  }>;
};

type GradeExamAttemptPayload = {
  score: number;
};

type ListExamAttemptsPayload = {
  page: number;
  limit: number;
  status?: ExamAttemptStatus;
};

const SERVER_ONLY_INTEGRITY_EVENT_TYPES = new Set<ExamAttemptEventType>([
  EXAM_ATTEMPT_EVENT_TYPE.timerExpired,
  EXAM_ATTEMPT_EVENT_TYPE.manualSubmit
]);

export class ExamAttemptService {
  constructor(
    private readonly examAttemptRepository: ExamAttemptRepository,
    private readonly examAttemptIntegrityRepository: ExamAttemptIntegrityRepository,
    private readonly courseRepository: CourseRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly auditRepository?: AuditRepository,
    private readonly notificationService?: NotificationService,
    private readonly certificateEligibilityService?: CertificateEligibilityService
  ) {}

  async startAttempt(user: Express.UserClaims | undefined, examId: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const exam = await this.examAttemptRepository.findExamForAttempt(examId);
    if (!exam) {
      throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    }

    const course = await this.courseRepository.findById(exam.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }
    if (course.status !== COURSE_STATUS.published || exam.status !== ExamStatus.PUBLISHED) {
      throw new AppError("Exam is not available", 403, "EXAM_NOT_AVAILABLE");
    }

    const enrollment = await this.enrollmentRepository.findByUserAndCourse(user.id, exam.courseId);
    if (!enrollment) {
      throw new AppError("Enroll in this course to take this exam", 403, "COURSE_ENROLLMENT_REQUIRED");
    }
    if (!exam.questions.length) {
      throw new AppError("Exam has no questions", 409, "EXAM_HAS_NO_QUESTIONS");
    }

    const currentAttempt = await this.examAttemptRepository.findInProgressAttempt(user.id, examId);
    if (currentAttempt) {
      return {
        exam,
        attempt: currentAttempt
      };
    }

    const latestAttempt = await this.examAttemptRepository.findLatestAttempt(user.id, examId);
    const attempt = await this.examAttemptRepository.createAttempt(user.id, examId, (latestAttempt?.attemptNumber ?? 0) + 1);
    return {
      exam,
      attempt
    };
  }

  async getAttempt(user: Express.UserClaims | undefined, attemptId: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const attempt = await this.examAttemptRepository.findById(attemptId);
    if (!attempt) {
      throw new AppError("Attempt not found", 404, "EXAM_ATTEMPT_NOT_FOUND");
    }
    if (attempt.userId !== user.id) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const exam = await this.examAttemptRepository.findExamForAttempt(attempt.examId);
    if (!exam) {
      throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    }

    return {
      exam,
      attempt
    };
  }

  async listExamAttempts(user: Express.UserClaims | undefined, examId: string, payload: ListExamAttemptsPayload) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const exam = await this.examAttemptRepository.findExamForAttempt(examId);
    if (!exam) {
      throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    }

    const course = await this.courseRepository.findById(exam.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    this.assertCanManageCourse(user, course.instructorId);
    const { items, total } = await this.examAttemptRepository.findByExamIdForReview(
      examId,
      payload.page,
      payload.limit,
      payload.status
    );

    const suspiciousCounts = await this.examAttemptIntegrityRepository.countSuspiciousByAttemptIds(
      items.map((item) => item.id)
    );

    return {
      items: items.map((item) => ({
        ...item,
        suspiciousEventCount: suspiciousCounts.get(item.id) ?? 0
      })),
      pagination: {
        page: payload.page,
        limit: payload.limit,
        total
      }
    };
  }

  async recordIntegrityEvents(user: Express.UserClaims | undefined, attemptId: string, payload: RecordIntegrityEventsPayload) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const attempt = await this.examAttemptRepository.findById(attemptId);
    if (!attempt) {
      throw new AppError("Attempt not found", 404, "EXAM_ATTEMPT_NOT_FOUND");
    }
    if (attempt.userId !== user.id) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) {
      throw new AppError("Attempt is no longer in progress", 409, "EXAM_ATTEMPT_NOT_IN_PROGRESS");
    }

    const clientEvents = payload.events.filter((event) => !SERVER_ONLY_INTEGRITY_EVENT_TYPES.has(event.type));
    if (clientEvents.length === 0) {
      throw new AppError("No recordable integrity events in payload", 422, "EXAM_INTEGRITY_EVENTS_EMPTY");
    }

    const created = await this.examAttemptIntegrityRepository.createMany(
      clientEvents.map((event) => ({
        attemptId,
        type: event.type,
        clientEventId: event.clientEventId ?? null,
        metadata: event.metadata ? (event.metadata as Prisma.InputJsonValue) : null
      }))
    );

    return { events: created };
  }

  async listIntegrityEvents(user: Express.UserClaims | undefined, attemptId: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    await this.assertCanViewIntegrityEvents(user, attemptId);
    const events = await this.examAttemptIntegrityRepository.findByAttemptId(attemptId);
    const suspiciousEventCount = events.filter((event) =>
      event.type === EXAM_ATTEMPT_EVENT_TYPE.tabHidden || event.type === EXAM_ATTEMPT_EVENT_TYPE.windowBlur
    ).length;

    return {
      attemptId,
      events,
      suspiciousEventCount
    };
  }

  async submitAttempt(user: Express.UserClaims | undefined, attemptId: string, payload: SubmitExamAttemptPayload, idempotencyKey: string | undefined) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    if (!idempotencyKey?.trim()) {
      throw new AppError("Idempotency-Key header is required", 400, "IDEMPOTENCY_KEY_REQUIRED");
    }

    const cacheKey = `idempotency:exam-submit:${user.id}:${attemptId}:${idempotencyKey.trim()}`;
    const cached = await redisConnection.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const attempt = await this.examAttemptRepository.findById(attemptId);
    if (!attempt) {
      throw new AppError("Attempt not found", 404, "EXAM_ATTEMPT_NOT_FOUND");
    }
    if (attempt.userId !== user.id) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) {
      const response = {
        attempt
      };
      await redisConnection.set(cacheKey, JSON.stringify(response), "EX", 86400);
      return response;
    }

    const exam = await this.examAttemptRepository.findExamForAttempt(attempt.examId);
    if (!exam) {
      throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    }

    const questionIds = new Set(exam.questions.map((question) => question.id));
    const answers: SubmitExamAnswerInput[] = payload.answers.map((item) => {
      if (!questionIds.has(item.questionId)) {
        throw new AppError("Answer contains question outside this exam", 422, "EXAM_ANSWER_QUESTION_MISMATCH");
      }

      return {
        questionId: item.questionId,
        answer: this.toJsonAnswer(item.answer)
      };
    });

    const submitEventType =
      payload.submitReason === EXAM_SUBMIT_REASON.timer
        ? EXAM_ATTEMPT_EVENT_TYPE.timerExpired
        : EXAM_ATTEMPT_EVENT_TYPE.manualSubmit;
    await this.examAttemptIntegrityRepository.createEvent({
      attemptId,
      type: submitEventType,
      clientEventId: `server:${submitEventType.toLowerCase()}`,
      metadata: { submitReason: payload.submitReason ?? EXAM_SUBMIT_REASON.manual }
    });

    const submittedAttempt = await this.examAttemptRepository.submitAttempt(attemptId, answers);
    await this.notificationService?.createNotification({
      userId: user.id,
      type: "SYSTEM",
      title: "Exam submitted",
      body: "Your exam submission was received and grading is in progress.",
      linkUrl: "/my-progress",
      metadata: {
        examId: exam.id,
        attemptId
      }
    });
    await examGradingQueue.add(
      "grade",
      { attemptId },
      {
        jobId: `exam-grade-${attemptId}`,
        removeOnComplete: true,
        removeOnFail: 100
      }
    );

    const response = {
      attempt: submittedAttempt
    };
    await redisConnection.set(cacheKey, JSON.stringify(response), "EX", 86400);
    return response;
  }

  async saveAttemptAnswers(user: Express.UserClaims | undefined, attemptId: string, payload: SaveExamAnswersPayload) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const attempt = await this.examAttemptRepository.findById(attemptId);
    if (!attempt) {
      throw new AppError("Attempt not found", 404, "EXAM_ATTEMPT_NOT_FOUND");
    }
    if (attempt.userId !== user.id) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) {
      return { attempt };
    }

    const exam = await this.examAttemptRepository.findExamForAttempt(attempt.examId);
    if (!exam) {
      throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    }

    const questionIds = new Set(exam.questions.map((question) => question.id));
    const answers: SubmitExamAnswerInput[] = payload.answers.map((item) => {
      if (!questionIds.has(item.questionId)) {
        throw new AppError("Answer contains question outside this exam", 422, "EXAM_ANSWER_QUESTION_MISMATCH");
      }

      return {
        questionId: item.questionId,
        answer: this.toJsonAnswer(item.answer)
      };
    });

    const updatedAttempt = await this.examAttemptRepository.upsertAttemptAnswers(attemptId, answers);
    return { attempt: updatedAttempt };
  }

  async gradeAttemptManually(user: Express.UserClaims | undefined, attemptId: string, payload: GradeExamAttemptPayload) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const attempt = await this.examAttemptRepository.findById(attemptId);
    if (!attempt) {
      throw new AppError("Attempt not found", 404, "EXAM_ATTEMPT_NOT_FOUND");
    }

    const gradingContext = await this.examAttemptRepository.findAttemptForGrading(attemptId);
    if (!gradingContext?.exam) {
      throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    }

    const course = await this.courseRepository.findById(gradingContext.exam.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    this.assertCanManageCourse(user, course.instructorId);

    if (attempt.status !== ExamAttemptStatus.SUBMITTED && attempt.status !== ExamAttemptStatus.GRADED) {
      throw new AppError("Attempt is not ready for grading", 409, "EXAM_ATTEMPT_NOT_SUBMITTED");
    }

    const gradedAttempt = await this.examAttemptRepository.markAttemptManuallyGraded(attemptId, payload.score);
    await this.notificationService?.createNotification({
      userId: gradingContext.userId,
      type: "SYSTEM",
      title: "Exam graded",
      body: `Your exam was graded. Score: ${gradedAttempt.score ?? 0}.`,
      linkUrl: "/my-progress",
      metadata: {
        examId: gradingContext.examId,
        attemptId: gradedAttempt.id,
        score: gradedAttempt.score
      }
    });
    await this.auditRepository?.create({
      actor: { connect: { id: user.id } },
      action: "EXAM_ATTEMPT_GRADED",
      entityType: "ExamAttempt",
      entityId: attemptId,
      metadata: {
        courseId: gradingContext.exam.courseId,
        examId: gradingContext.examId,
        userId: gradingContext.userId,
        attemptNumber: gradingContext.attemptNumber,
        before: {
          status: attempt.status,
          score: attempt.score
        },
        after: {
          status: gradedAttempt.status,
          score: gradedAttempt.score
        }
      }
    });
    await this.certificateEligibilityService?.tryIssueCertificateIfEligible(
      gradingContext.userId,
      gradingContext.exam.courseId
    );
    return { attempt: gradedAttempt };
  }

  private async assertCanViewIntegrityEvents(user: Express.UserClaims, attemptId: string) {
    const attempt = await this.examAttemptRepository.findById(attemptId);
    if (!attempt) {
      throw new AppError("Attempt not found", 404, "EXAM_ATTEMPT_NOT_FOUND");
    }

    if (attempt.userId === user.id) {
      return;
    }

    const exam = await this.examAttemptRepository.findExamForAttempt(attempt.examId);
    if (!exam) {
      throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    }

    const course = await this.courseRepository.findById(exam.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    this.assertCanManageCourse(user, course.instructorId);
  }

  private assertCanManageCourse(user: Express.UserClaims, instructorId: string) {
    assertCourseInstructor(user, instructorId);
  }

  private toJsonAnswer(answer: string | string[] | null): Prisma.InputJsonValue | null {
    if (answer === null) {
      return null;
    }
    if (Array.isArray(answer)) {
      return answer;
    }
    return answer;
  }
}
