import { AssignmentStatus } from "@prisma/client";
import { ASSIGNMENT_STATUS, COURSE_STATUS, USER_ROLE } from "../../common/constants/business";
import { AppError } from "../../common/errors/app-error";
import { assertCourseInstructor, canViewCourseAsStaff } from "../../common/auth/course-access";
import { AuditRepository } from "../audit/audit.repository";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { ASSIGNMENT_RUBRIC_LIMITS } from "../../common/constants/assignment";
import { AssignmentRubricRepository } from "./assignment-rubric.repository";
import { AssignmentRepository } from "./assignment.repository";

type AssignmentPayload = {
  title: string;
  instructions?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  dueAt?: Date | null;
  maxScore?: number | null;
  attachmentUrl?: string | null;
};

type UpdateAssignmentPayload = Partial<AssignmentPayload>;

type ReplaceRubricCriterionPayload = {
  title: string;
  description?: string | null;
  maxPoints: number;
};

export class AssignmentService {
  constructor(
    private readonly assignmentRepository: AssignmentRepository,
    private readonly assignmentRubricRepository: AssignmentRubricRepository,
    private readonly courseRepository: CourseRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly auditRepository?: AuditRepository
  ) {}

  async listCourseAssignments(user: Express.UserClaims | undefined, courseId: string) {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const isStaff = canViewCourseAsStaff(user, course.instructorId);
    if (isStaff) {
      return this.assignmentRepository.findByCourseId(courseId);
    }

    if (course.status !== COURSE_STATUS.published) {
      throw new AppError("Course is not available", 403, "FORBIDDEN");
    }
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const enrollment = await this.enrollmentRepository.findByUserAndCourse(user.id, courseId);
    if (!enrollment) {
      throw new AppError("Enroll in this course to view assignments", 403, "COURSE_ENROLLMENT_REQUIRED");
    }

    return this.assignmentRepository.findByCourseId(courseId, AssignmentStatus.PUBLISHED, user.id);
  }

  async createCourseAssignment(user: Express.UserClaims | undefined, courseId: string, payload: AssignmentPayload) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    this.assertCanManageCourse(user, course.instructorId);

    const assignment = await this.assignmentRepository.create({
      course: { connect: { id: courseId } },
      title: payload.title,
      instructions: payload.instructions || null,
      status: payload.status,
      dueAt: payload.dueAt ?? null,
      maxScore: payload.maxScore ?? null,
      attachmentUrl: payload.attachmentUrl || null,
      archivedAt: payload.status === ASSIGNMENT_STATUS.archived ? new Date() : null
    });

    await this.auditRepository?.create({
      actor: { connect: { id: user.id } },
      action: "ASSIGNMENT_CREATED",
      entityType: "Assignment",
      entityId: assignment.id,
      metadata: {
        courseId,
        status: assignment.status
      }
    });

    return assignment;
  }

  async updateAssignment(user: Express.UserClaims | undefined, assignmentId: string, payload: UpdateAssignmentPayload) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const assignment = await this.assignmentRepository.findById(assignmentId);
    if (!assignment) {
      throw new AppError("Assignment not found", 404, "ASSIGNMENT_NOT_FOUND");
    }

    const course = await this.courseRepository.findById(assignment.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    this.assertCanManageCourse(user, course.instructorId);

    const updatedAssignment = await this.assignmentRepository.update(assignmentId, {
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.instructions !== undefined ? { instructions: payload.instructions || null } : {}),
      ...(payload.dueAt !== undefined ? { dueAt: payload.dueAt } : {}),
      ...(payload.maxScore !== undefined ? { maxScore: payload.maxScore } : {}),
      ...(payload.attachmentUrl !== undefined ? { attachmentUrl: payload.attachmentUrl || null } : {}),
      ...(payload.status !== undefined
        ? {
            status: payload.status,
            archivedAt: payload.status === ASSIGNMENT_STATUS.archived ? new Date() : assignment.status === ASSIGNMENT_STATUS.archived ? null : assignment.archivedAt
          }
        : {})
    });

    await this.auditRepository?.create({
      actor: { connect: { id: user.id } },
      action: payload.status && payload.status !== assignment.status ? "ASSIGNMENT_STATUS_UPDATED" : "ASSIGNMENT_UPDATED",
      entityType: "Assignment",
      entityId: assignmentId,
      metadata: {
        courseId: assignment.courseId,
        before: { status: assignment.status },
        after: { status: updatedAssignment.status }
      }
    });

    return updatedAssignment;
  }

  async archiveAssignment(user: Express.UserClaims | undefined, assignmentId: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const assignment = await this.assignmentRepository.findById(assignmentId);
    if (!assignment) {
      throw new AppError("Assignment not found", 404, "ASSIGNMENT_NOT_FOUND");
    }

    const course = await this.courseRepository.findById(assignment.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    this.assertCanManageCourse(user, course.instructorId);

    if (assignment.status === ASSIGNMENT_STATUS.archived) {
      return assignment;
    }

    const archivedAssignment = await this.assignmentRepository.archive(assignmentId);
    await this.auditRepository?.create({
      actor: { connect: { id: user.id } },
      action: "ASSIGNMENT_ARCHIVED",
      entityType: "Assignment",
      entityId: assignmentId,
      metadata: {
        courseId: assignment.courseId,
        before: { status: assignment.status },
        after: { status: ASSIGNMENT_STATUS.archived }
      }
    });

    return archivedAssignment;
  }

  async replaceAssignmentRubric(
    user: Express.UserClaims | undefined,
    assignmentId: string,
    criteria: ReplaceRubricCriterionPayload[]
  ) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    if (criteria.length > ASSIGNMENT_RUBRIC_LIMITS.maxCriteria) {
      throw new AppError("Too many rubric criteria", 422, "VALIDATION_ERROR");
    }

    const assignment = await this.assignmentRepository.findById(assignmentId);
    if (!assignment) {
      throw new AppError("Assignment not found", 404, "ASSIGNMENT_NOT_FOUND");
    }

    const course = await this.courseRepository.findById(assignment.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    this.assertCanManageCourse(user, course.instructorId);

    const rubricCriteria = await this.assignmentRubricRepository.replaceCriteria(assignmentId, criteria);
    const refreshedAssignment = await this.assignmentRepository.findById(assignmentId);

    await this.auditRepository?.create({
      actor: { connect: { id: user.id } },
      action: "ASSIGNMENT_RUBRIC_UPDATED",
      entityType: "Assignment",
      entityId: assignmentId,
      metadata: {
        courseId: assignment.courseId,
        criterionCount: rubricCriteria.length
      }
    });

    return refreshedAssignment;
  }

  private assertCanManageCourse(user: Express.UserClaims, instructorId: string) {
    assertCourseInstructor(user, instructorId);
  }
}
