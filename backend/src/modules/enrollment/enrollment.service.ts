import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { AppError } from "../../common/errors/app-error";
import { COURSE_STATUS } from "../../common/constants/business";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "./enrollment.repository";

export class EnrollmentService {
  constructor(
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly courseRepository: CourseRepository
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
      return await this.enrollmentRepository.create(user.id, payload.courseId);
    } catch (error: unknown) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await this.enrollmentRepository.findByUserAndCourse(user.id, payload.courseId);
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }
}
