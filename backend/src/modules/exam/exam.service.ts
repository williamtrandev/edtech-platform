import { ExamScope, ExamStatus } from "@prisma/client";
import { COURSE_STATUS, EXAM_SCOPE, EXAM_STATUS, USER_ROLE } from "../../common/constants/business";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../../common/constants/audit";
import { AppError } from "../../common/errors/app-error";
import { assertCourseInstructor, canViewCourseAsStaff } from "../../common/auth/course-access";
import { AuditRepository } from "../audit/audit.repository";
import { CourseRepository } from "../course/course.repository";
import { LessonRepository } from "../lesson/lesson.repository";
import { ExamRepository } from "./exam.repository";

type ExamPayload = {
  title: string;
  description?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  durationMinutes?: number | null;
  passingScore?: number | null;
  scope?: ExamScope;
  lessonId?: string | null;
};

type UpdateExamPayload = Partial<ExamPayload>;

type ListCourseExamsQuery = {
  scope?: ExamScope;
  lessonId?: string;
};

export class ExamService {
  constructor(
    private readonly examRepository: ExamRepository,
    private readonly courseRepository: CourseRepository,
    private readonly lessonRepository: LessonRepository,
    private readonly auditRepository?: AuditRepository
  ) {}

  async listCourseExams(user: Express.UserClaims | undefined, courseId: string, query?: ListCourseExamsQuery) {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const isStaff = canViewCourseAsStaff(user, course.instructorId);
    if (!isStaff && course.status !== COURSE_STATUS.published) {
      throw new AppError("Course is not available", 403, "FORBIDDEN");
    }

    return this.examRepository.findByCourseId(courseId, {
      status: isStaff ? undefined : ExamStatus.PUBLISHED,
      scope: query?.scope,
      lessonId: query?.lessonId
    });
  }

  async createCourseExam(user: Express.UserClaims | undefined, courseId: string, payload: ExamPayload) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    this.assertCanManageCourse(user, course.instructorId);

    const scope = payload.scope ?? EXAM_SCOPE.course;
    const lessonId = await this.resolveLessonIdForScope(courseId, scope, payload.lessonId ?? null);

    const exam = await this.examRepository.create({
      course: { connect: { id: courseId } },
      ...(lessonId ? { lesson: { connect: { id: lessonId } } } : {}),
      scope,
      title: payload.title,
      description: payload.description || null,
      status: payload.status,
      durationMinutes: payload.durationMinutes ?? null,
      passingScore: payload.passingScore ?? null,
      archivedAt: payload.status === EXAM_STATUS.archived ? new Date() : null
    });

    await this.auditRepository?.create({
      actor: { connect: { id: user.id } },
      action: AUDIT_ACTION.examCreated,
      entityType: AUDIT_ENTITY_TYPE.exam,
      entityId: exam.id,
      metadata: {
        courseId,
        status: exam.status
      }
    });

    return exam;
  }

  async updateExam(user: Express.UserClaims | undefined, examId: string, payload: UpdateExamPayload) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const exam = await this.examRepository.findById(examId);
    if (!exam) {
      throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    }

    const course = await this.courseRepository.findById(exam.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    this.assertCanManageCourse(user, course.instructorId);

    const nextScope = payload.scope ?? exam.scope;
    const nextLessonId =
      payload.scope !== undefined || payload.lessonId !== undefined
        ? await this.resolveLessonIdForScope(
            exam.courseId,
            nextScope,
            payload.lessonId !== undefined ? payload.lessonId : exam.lessonId
          )
        : undefined;

    const data = {
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.description !== undefined ? { description: payload.description || null } : {}),
      ...(payload.durationMinutes !== undefined ? { durationMinutes: payload.durationMinutes } : {}),
      ...(payload.passingScore !== undefined ? { passingScore: payload.passingScore } : {}),
      ...(payload.scope !== undefined ? { scope: payload.scope } : {}),
      ...(nextLessonId !== undefined
        ? nextLessonId
          ? { lesson: { connect: { id: nextLessonId } } }
          : { lesson: { disconnect: true } }
        : {}),
      ...(payload.status !== undefined
        ? {
            status: payload.status,
            archivedAt: payload.status === EXAM_STATUS.archived ? new Date() : exam.status === EXAM_STATUS.archived ? null : exam.archivedAt
          }
        : {})
    };

    const updatedExam = await this.examRepository.update(examId, data);
    await this.auditRepository?.create({
      actor: { connect: { id: user.id } },
      action: payload.status && payload.status !== exam.status ? AUDIT_ACTION.examStatusUpdated : AUDIT_ACTION.examUpdated,
      entityType: AUDIT_ENTITY_TYPE.exam,
      entityId: examId,
      metadata: {
        courseId: exam.courseId,
        before: { status: exam.status },
        after: { status: updatedExam.status }
      }
    });

    return updatedExam;
  }

  async archiveExam(user: Express.UserClaims | undefined, examId: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const exam = await this.examRepository.findById(examId);
    if (!exam) {
      throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    }

    const course = await this.courseRepository.findById(exam.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    this.assertCanManageCourse(user, course.instructorId);

    if (exam.status === EXAM_STATUS.archived) {
      return exam;
    }

    const archivedExam = await this.examRepository.archive(examId);
    await this.auditRepository?.create({
      actor: { connect: { id: user.id } },
      action: AUDIT_ACTION.examArchived,
      entityType: AUDIT_ENTITY_TYPE.exam,
      entityId: examId,
      metadata: {
        courseId: exam.courseId,
        before: { status: exam.status },
        after: { status: EXAM_STATUS.archived }
      }
    });

    return archivedExam;
  }

  private async resolveLessonIdForScope(courseId: string, scope: ExamScope, lessonId: string | null) {
    if (scope === EXAM_SCOPE.course) {
      return null;
    }

    if (!lessonId) {
      throw new AppError("Lesson is required for lesson-scoped exercises", 422, "VALIDATION_ERROR");
    }

    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson || lesson.courseId !== courseId) {
      throw new AppError("Lesson not found in this course", 404, "LESSON_NOT_FOUND");
    }

    return lessonId;
  }

  private assertCanManageCourse(user: Express.UserClaims, instructorId: string) {
    assertCourseInstructor(user, instructorId);
  }
}
