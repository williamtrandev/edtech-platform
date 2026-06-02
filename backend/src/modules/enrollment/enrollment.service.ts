import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { AppError } from "../../common/errors/app-error";
import { assertCanBeEnrolledByManager, assertCanSelfEnroll } from "../../common/auth/enrollment-access";
import { assertCourseInstructor } from "../../common/auth/course-access";
import { COURSE_STATUS, NOTIFICATION_TYPE, USER_STATUS } from "../../common/constants/business";
import { CourseRepository } from "../course/course.repository";
import { NotificationService } from "../notification/notification.service";
import { CourseProgressService } from "../progress/course-progress.service";
import { UserRepository } from "../user/user.repository";
import { EnrollmentRepository } from "./enrollment.repository";

export class EnrollmentService {
  constructor(
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly courseRepository: CourseRepository,
    private readonly courseProgressService: CourseProgressService,
    private readonly userRepository: UserRepository,
    private readonly notificationService?: NotificationService
  ) {}

  async listMyEnrollments(user: Express.UserClaims | undefined) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const enrollments = await this.enrollmentRepository.findByUser(user.id);
    return this.withProgressSnapshots(enrollments, user.id);
  }

  async createEnrollment(user: Express.UserClaims | undefined, payload: { courseId: string }) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const course = await this.courseRepository.findById(payload.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    if (course.status === COURSE_STATUS.locked) {
      throw new AppError("Course is locked", 409, "COURSE_LOCKED");
    }

    if (course.status !== COURSE_STATUS.published) {
      throw new AppError("Course is not open for enrollment", 409, "COURSE_NOT_PUBLISHED");
    }

    const actor = await this.userRepository.findById(user.id);
    if (!actor) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    assertCanSelfEnroll({ id: actor.id, status: actor.status }, { instructorId: course.instructorId });

    try {
      const enrollment = await this.enrollmentRepository.create(user.id, payload.courseId);
      await this.notificationService?.createNotification({
        userId: user.id,
        type: NOTIFICATION_TYPE.enrollmentSuccess,
        title: "Enrollment successful",
        body: `You are enrolled in ${course.title}.`,
        linkUrl: `/courses/${course.id}`,
        metadata: {
          courseId: course.id
        }
      });
      return this.withProgressSnapshot(enrollment, user.id, payload.courseId);
    } catch (error: unknown) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await this.enrollmentRepository.findByUserAndCourse(user.id, payload.courseId);
        if (existing) {
          return this.withProgressSnapshot(existing, user.id, payload.courseId);
        }
      }
      throw error;
    }
  }

  async dropMyEnrollment(user: Express.UserClaims | undefined, enrollmentId: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const enrollment = await this.enrollmentRepository.findById(enrollmentId);
    if (!enrollment) {
      throw new AppError("Enrollment not found", 404, "ENROLLMENT_NOT_FOUND");
    }
    if (enrollment.userId !== user.id) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    return this.enrollmentRepository.deleteByUserAndCourse(user.id, enrollment.courseId);
  }

  async enrollUserByManager(user: Express.UserClaims | undefined, courseId: string, email: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    assertCourseInstructor(user, course.instructorId);
    if (course.status === COURSE_STATUS.locked) {
      throw new AppError("Course is locked", 409, "COURSE_LOCKED");
    }

    const learner = await this.userRepository.findByEmail(email);
    if (!learner) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }
    if (learner.status === USER_STATUS.suspended) {
      throw new AppError("User is suspended", 409, "USER_SUSPENDED");
    }

    assertCanBeEnrolledByManager({ id: learner.id, status: learner.status }, { instructorId: course.instructorId });

    try {
      const enrollment = await this.enrollmentRepository.create(learner.id, courseId);
      await this.notificationService?.createNotification({
        userId: learner.id,
        type: NOTIFICATION_TYPE.enrollmentSuccess,
        title: "Enrollment successful",
        body: `You were enrolled in ${course.title}.`,
        linkUrl: `/courses/${course.id}`,
        metadata: {
          courseId: course.id,
          enrolledBy: user.id
        }
      });
      return this.withProgressSnapshot(enrollment, learner.id, courseId);
    } catch (error: unknown) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await this.enrollmentRepository.findByUserAndCourse(learner.id, courseId);
        if (existing) {
          return this.withProgressSnapshot(existing, learner.id, courseId);
        }
      }
      throw error;
    }
  }

  async removeUserEnrollmentByManager(user: Express.UserClaims | undefined, courseId: string, targetUserId: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    assertCourseInstructor(user, course.instructorId);

    const enrollment = await this.enrollmentRepository.findByUserAndCourse(targetUserId, courseId);
    if (!enrollment) {
      throw new AppError("Enrollment not found", 404, "ENROLLMENT_NOT_FOUND");
    }

    return this.enrollmentRepository.deleteByUserAndCourse(targetUserId, courseId);
  }

  private toProgressPayload(snapshot: Awaited<ReturnType<CourseProgressService["getSnapshot"]>>) {
    return {
      courseId: snapshot.courseId,
      totalLessons: snapshot.totalLessons,
      completedLessons: snapshot.completedLessons,
      totalExams: snapshot.totalExams,
      passedExams: snapshot.passedExams,
      totalAssignments: snapshot.totalAssignments,
      submittedAssignments: snapshot.submittedAssignments,
      percentage: snapshot.percentage,
      isComplete: snapshot.isComplete,
      completionCriteria: snapshot.completionCriteria,
      breakdown: snapshot.breakdown
    };
  }

  private async withProgressSnapshot<T extends { courseId: string }>(enrollment: T, userId: string, courseId: string) {
    const snapshot = await this.courseProgressService.getSnapshot(userId, courseId);

    return {
      ...enrollment,
      progress: this.toProgressPayload(snapshot)
    };
  }

  private async withProgressSnapshots<T extends { courseId: string }>(enrollments: T[], userId: string) {
    if (enrollments.length === 0) {
      return enrollments;
    }

    const snapshots = await Promise.all(
      enrollments.map(async (enrollment) => {
        const snapshot = await this.courseProgressService.getSnapshot(userId, enrollment.courseId);
        return {
          ...enrollment,
          progress: this.toProgressPayload(snapshot)
        };
      })
    );

    return snapshots;
  }
}
