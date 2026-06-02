import { ExamStatus } from "@prisma/client";
import { COURSE_STATUS, EXAM_STATUS, USER_ROLE } from "../../common/constants/business";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../../common/constants/audit";
import { AppError } from "../../common/errors/app-error";
import { assertCourseInstructor, canViewCourseAsStaff } from "../../common/auth/course-access";
import { AuditRepository } from "../audit/audit.repository";
import { CourseRepository } from "../course/course.repository";
import { ExamRepository } from "./exam.repository";

type ExamPayload = {
  title: string;
  description?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  durationMinutes?: number | null;
  passingScore?: number | null;
};

type UpdateExamPayload = Partial<ExamPayload>;

export class ExamService {
  constructor(
    private readonly examRepository: ExamRepository,
    private readonly courseRepository: CourseRepository,
    private readonly auditRepository?: AuditRepository
  ) {}

  async listCourseExams(user: Express.UserClaims | undefined, courseId: string) {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const isStaff = canViewCourseAsStaff(user, course.instructorId);
    if (!isStaff && course.status !== COURSE_STATUS.published) {
      throw new AppError("Course is not available", 403, "FORBIDDEN");
    }

    return this.examRepository.findByCourseId(courseId, isStaff ? undefined : ExamStatus.PUBLISHED);
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

    const exam = await this.examRepository.create({
      course: { connect: { id: courseId } },
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

    const data = {
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.description !== undefined ? { description: payload.description || null } : {}),
      ...(payload.durationMinutes !== undefined ? { durationMinutes: payload.durationMinutes } : {}),
      ...(payload.passingScore !== undefined ? { passingScore: payload.passingScore } : {}),
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

  private assertCanManageCourse(user: Express.UserClaims, instructorId: string) {
    assertCourseInstructor(user, instructorId);
  }
}
