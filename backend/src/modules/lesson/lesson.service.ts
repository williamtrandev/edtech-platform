import { AppError } from "../../common/errors/app-error";
import { COURSE_STATUS, USER_ROLE } from "../../common/constants/business";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { LessonRepository } from "./lesson.repository";

type CreateLessonPayload = {
  courseId: string;
  title: string;
  contentType: "VIDEO" | "TEXT" | "RESOURCE";
  content: string;
  sortOrder: number;
};

export class LessonService {
  constructor(
    private readonly lessonRepository: LessonRepository,
    private readonly courseRepository: CourseRepository,
    private readonly enrollmentRepository: EnrollmentRepository
  ) {}

  async listLessons(user: Express.UserClaims | undefined, courseId: string) {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    if (!user?.id) {
      if (course.status !== COURSE_STATUS.published) {
        throw new AppError("Course is not available", 403, "FORBIDDEN");
      }
      return this.lessonRepository.findByCourseId(courseId);
    }

    const canAccessCourse = user.role === USER_ROLE.admin || course.instructorId === user.id;
    if (!canAccessCourse) {
      const enrollment = await this.enrollmentRepository.findByUserAndCourse(user.id, courseId);
      if (!enrollment && course.status !== COURSE_STATUS.published) {
        throw new AppError("Forbidden", 403, "COURSE_ACCESS_DENIED");
      }
    }

    return this.lessonRepository.findByCourseId(courseId);
  }

  async createLesson(user: Express.UserClaims | undefined, payload: CreateLessonPayload) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const course = await this.courseRepository.findById(payload.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const canManageCourse = user.role === USER_ROLE.admin || course.instructorId === user.id;
    if (!canManageCourse) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    return this.lessonRepository.create({
      course: { connect: { id: payload.courseId } },
      title: payload.title,
      contentType: payload.contentType,
      content: payload.content,
      sortOrder: payload.sortOrder
    });
  }
}
