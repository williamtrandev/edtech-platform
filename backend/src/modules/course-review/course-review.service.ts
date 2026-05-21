import { COURSE_STATUS, USER_ROLE } from "../../common/constants/business";
import { AppError } from "../../common/errors/app-error";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { CourseReviewRepository } from "./course-review.repository";

export class CourseReviewService {
  constructor(
    private readonly courseReviewRepository: CourseReviewRepository,
    private readonly courseRepository: CourseRepository,
    private readonly enrollmentRepository: EnrollmentRepository
  ) {}

  async listCourseReviews(user: Express.UserClaims | undefined, courseId: string, page: number, limit: number) {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const canViewUnpublished = user?.role === USER_ROLE.admin || course.instructorId === user?.id;
    if (!canViewUnpublished && course.status !== COURSE_STATUS.published) {
      throw new AppError("Course is not available", 403, "FORBIDDEN");
    }

    const { items, total } = await this.courseReviewRepository.findByCourseId(courseId, page, limit);
    return {
      items,
      pagination: {
        page,
        limit,
        total
      }
    };
  }

  async upsertMyReview(user: Express.UserClaims | undefined, courseId: string, payload: { rating: number; comment?: string | null }) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }
    if (course.status !== COURSE_STATUS.published) {
      throw new AppError("Course is not open for reviews", 409, "COURSE_NOT_PUBLISHED");
    }

    const enrollment = await this.enrollmentRepository.findByUserAndCourse(user.id, courseId);
    if (!enrollment) {
      throw new AppError("Enroll in this course to review it", 403, "COURSE_ENROLLMENT_REQUIRED");
    }

    return this.courseReviewRepository.upsertUserReview(user.id, courseId, {
      rating: payload.rating,
      comment: payload.comment?.trim() || null
    });
  }

  async deleteMyReview(user: Express.UserClaims | undefined, courseId: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    await this.courseReviewRepository.deleteUserReview(user.id, courseId);
  }
}
