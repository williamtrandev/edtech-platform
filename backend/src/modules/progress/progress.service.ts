import { AppError } from "../../common/errors/app-error";
import { USER_ROLE } from "../../common/constants/business";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { ProgressRepository } from "./progress.repository";

export class ProgressService {
  constructor(
    private readonly progressRepository: ProgressRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly courseRepository: CourseRepository
  ) {}

  async upsertLessonProgress(user: Express.UserClaims | undefined, payload: { lessonId: string; isCompleted: boolean }) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const lesson = await this.progressRepository.findLessonById(payload.lessonId);
    if (!lesson) {
      throw new AppError("Lesson not found", 404, "LESSON_NOT_FOUND");
    }

    const course = await this.courseRepository.findById(lesson.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const canAccessCourse = user.role === USER_ROLE.admin || course.instructorId === user.id;
    if (!canAccessCourse) {
      const enrollment = await this.enrollmentRepository.findByUserAndCourse(user.id, lesson.courseId);
      if (!enrollment) {
        throw new AppError("Forbidden", 403, "COURSE_ACCESS_DENIED");
      }
    }

    return this.progressRepository.upsertLessonProgress(user.id, payload.lessonId, payload.isCompleted);
  }

  async getMyCourseProgress(user: Express.UserClaims | undefined, courseId: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const canAccessCourse = user.role === USER_ROLE.admin || course.instructorId === user.id;
    if (!canAccessCourse) {
      const enrollment = await this.enrollmentRepository.findByUserAndCourse(user.id, courseId);
      if (!enrollment) {
        throw new AppError("Forbidden", 403, "COURSE_ACCESS_DENIED");
      }
    }

    const [totalLessons, completedLessons] = await Promise.all([
      this.progressRepository.countCourseLessons(courseId),
      this.progressRepository.countCompletedCourseLessons(user.id, courseId)
    ]);

    return {
      courseId,
      totalLessons,
      completedLessons,
      percentage: totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100)
    };
  }
}
