import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { AppError } from "../../common/errors/app-error";
import { COURSE_STATUS } from "../../common/constants/business";
import { CourseRepository } from "../course/course.repository";
import { ProgressRepository } from "../progress/progress.repository";
import { EnrollmentRepository } from "./enrollment.repository";

export class EnrollmentService {
  constructor(
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly courseRepository: CourseRepository,
    private readonly progressRepository: ProgressRepository
  ) {}

  async listMyEnrollments(user: Express.UserClaims | undefined) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.enrollmentRepository.findByUser(user.id);
  }

  async createEnrollment(user: Express.UserClaims | undefined, payload: { courseId: string }) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const course = await this.courseRepository.findById(payload.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    if (course.status !== COURSE_STATUS.published) {
      throw new AppError("Course is not open for enrollment", 409, "COURSE_NOT_PUBLISHED");
    }

    try {
      const enrollment = await this.enrollmentRepository.create(user.id, payload.courseId);
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

  private async withProgressSnapshot<T extends { courseId: string }>(enrollment: T, userId: string, courseId: string) {
    const totalLessons = await this.progressRepository.countCourseLessons(courseId);
    const completedLessons = await this.progressRepository.countCompletedCourseLessons(userId, courseId);

    return {
      ...enrollment,
      progress: {
        courseId,
        totalLessons,
        completedLessons,
        percentage: totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100)
      }
    };
  }
}
