import { AssignmentStatus } from "@prisma/client";
import { assertCourseInstructor } from "../../common/auth/course-access";
import { COURSE_STATUS, NOTIFICATION_TYPE } from "../../common/constants/business";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, AUDIT_GRADING_SOURCE } from "../../common/constants/audit";
import { AppError } from "../../common/errors/app-error";
import { AuditRepository } from "../audit/audit.repository";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { NotificationService } from "../notification/notification.service";
import { CertificateEligibilityService } from "../progress/certificate-eligibility.service";
import { assertScoreWithinAssignmentMax, resolveGradeScore } from "../../common/assignment-rubric/assignment-rubric";
import { AssignmentSubmissionRepository } from "./assignment-submission.repository";

type SubmitAssignmentPayload = {
  content?: string | null;
  attachmentUrl?: string | null;
};

type GradeAssignmentPayload = {
  score?: number;
  feedback?: string | null;
  rubricScores?: Array<{ criterionId: string; points: number }>;
};

export class AssignmentSubmissionService {
  constructor(
    private readonly assignmentSubmissionRepository: AssignmentSubmissionRepository,
    private readonly courseRepository: CourseRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly auditRepository?: AuditRepository,
    private readonly notificationService?: NotificationService,
    private readonly certificateEligibilityService?: CertificateEligibilityService
  ) {}

  async listAssignmentSubmissions(user: Express.UserClaims | undefined, assignmentId: string, page: number, limit: number) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const assignment = await this.assignmentSubmissionRepository.findAssignmentForSubmission(assignmentId);
    if (!assignment) {
      throw new AppError("Assignment not found", 404, "ASSIGNMENT_NOT_FOUND");
    }

    const course = await this.courseRepository.findById(assignment.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    this.assertCanManageCourse(user, course.instructorId);
    const { items, total } = await this.assignmentSubmissionRepository.findByAssignmentId(assignmentId, page, limit);
    return {
      items,
      pagination: {
        page,
        limit,
        total
      }
    };
  }

  async submitAssignment(user: Express.UserClaims | undefined, assignmentId: string, payload: SubmitAssignmentPayload) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const assignment = await this.assignmentSubmissionRepository.findAssignmentForSubmission(assignmentId);
    if (!assignment) {
      throw new AppError("Assignment not found", 404, "ASSIGNMENT_NOT_FOUND");
    }
    if (assignment.status !== AssignmentStatus.PUBLISHED) {
      throw new AppError("Assignment is not available", 403, "ASSIGNMENT_NOT_AVAILABLE");
    }

    const course = await this.courseRepository.findById(assignment.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }
    if (course.status !== COURSE_STATUS.published) {
      throw new AppError("Course is not available", 403, "FORBIDDEN");
    }

    const enrollment = await this.enrollmentRepository.findByUserAndCourse(user.id, assignment.courseId);
    if (!enrollment) {
      throw new AppError("Enroll in this course to submit assignments", 403, "COURSE_ENROLLMENT_REQUIRED");
    }

    const submittedAt = new Date();
    const isLate = Boolean(assignment.dueAt && submittedAt > assignment.dueAt);

    const submission = await this.assignmentSubmissionRepository.upsertSubmission(user.id, assignmentId, {
      content: payload.content || null,
      attachmentUrl: payload.attachmentUrl || null,
      isLate
    });

    await this.certificateEligibilityService?.tryIssueCertificateIfEligible(user.id, assignment.courseId);

    return submission;
  }

  async gradeSubmission(user: Express.UserClaims | undefined, submissionId: string, payload: GradeAssignmentPayload) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const submission = await this.assignmentSubmissionRepository.findById(submissionId);
    if (!submission) {
      throw new AppError("Submission not found", 404, "ASSIGNMENT_SUBMISSION_NOT_FOUND");
    }

    const course = await this.courseRepository.findById(submission.assignment.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    this.assertCanManageCourse(user, course.instructorId);

    const { score, rubricScores } = resolveGradeScore(submission.assignment.rubricCriteria, payload);
    assertScoreWithinAssignmentMax(score, submission.assignment.maxScore);

    const gradedSubmission = await this.assignmentSubmissionRepository.gradeSubmission(submissionId, {
      score,
      feedback: payload.feedback,
      rubricScores
    });
    await this.notificationService?.createNotification({
      userId: submission.userId,
      type: NOTIFICATION_TYPE.assignmentGraded,
      title: "Assignment graded",
      body: `${submission.assignment.title} was graded.`,
      linkUrl: `/courses/${submission.assignment.courseId}`,
      metadata: {
        assignmentId: submission.assignmentId,
        submissionId,
        score: gradedSubmission.score
      }
    });
    await this.auditRepository?.create({
      actor: { connect: { id: user.id } },
      action: AUDIT_ACTION.assignmentSubmissionGraded,
      entityType: AUDIT_ENTITY_TYPE.assignmentSubmission,
      entityId: submissionId,
      metadata: {
        assignmentId: submission.assignmentId,
        courseId: submission.assignment.courseId,
        userId: submission.userId,
        gradingSource: AUDIT_GRADING_SOURCE.manual,
        before: {
          score: submission.score,
          feedback: submission.feedback
        },
        after: {
          score: gradedSubmission.score,
          feedback: gradedSubmission.feedback
        }
      }
    });

    return gradedSubmission;
  }

  private assertCanManageCourse(user: Express.UserClaims, instructorId: string) {
    assertCourseInstructor(user, instructorId);
  }
}
