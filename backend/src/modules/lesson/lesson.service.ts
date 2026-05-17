import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
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

type UpdateLessonOrderPayload = {
  lessonId: string;
  sortOrder: number;
};

type UpdateLessonPayload = {
  lessonId: string;
  title: string;
  contentType: "VIDEO" | "TEXT" | "RESOURCE";
  content: string;
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

    try {
      return await this.lessonRepository.create({
        course: { connect: { id: payload.courseId } },
        title: payload.title,
        contentType: payload.contentType,
        content: payload.content,
        sortOrder: payload.sortOrder
      });
    } catch (error: unknown) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError("Lesson order already exists in this course", 409, "LESSON_SORT_ORDER_CONFLICT");
      }

      throw error;
    }
  }

  async updateLessonOrder(user: Express.UserClaims | undefined, payload: UpdateLessonOrderPayload) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const lesson = await this.lessonRepository.findById(payload.lessonId);
    if (!lesson) {
      throw new AppError("Lesson not found", 404, "LESSON_NOT_FOUND");
    }

    const course = await this.courseRepository.findById(lesson.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const canManageCourse = user.role === USER_ROLE.admin || course.instructorId === user.id;
    if (!canManageCourse) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const lessons = await this.lessonRepository.findByCourseId(lesson.courseId);
    const boundedSortOrder = Math.max(1, Math.min(payload.sortOrder, lessons.length));

    try {
      return await this.lessonRepository.moveWithinCourse(lesson.id, lesson.courseId, lesson.sortOrder, boundedSortOrder);
    } catch (error: unknown) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError("Lesson order already exists in this course", 409, "LESSON_SORT_ORDER_CONFLICT");
      }

      throw error;
    }
  }

  async reorderCourseLessons(user: Express.UserClaims | undefined, courseId: string, lessonIds: string[]) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const canManageCourse = user.role === USER_ROLE.admin || course.instructorId === user.id;
    if (!canManageCourse) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const lessons = await this.lessonRepository.findByCourseId(courseId);
    const existingIds = new Set(lessons.map((lesson) => lesson.id));
    const requestedIds = new Set(lessonIds);
    if (lessonIds.length !== lessons.length || requestedIds.size !== lessonIds.length || lessonIds.some((lessonId) => !existingIds.has(lessonId))) {
      throw new AppError("Lesson order payload does not match course lessons", 422, "LESSON_ORDER_MISMATCH");
    }

    return this.lessonRepository.reorderCourseLessons(courseId, lessonIds);
  }

  async updateLesson(user: Express.UserClaims | undefined, payload: UpdateLessonPayload) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const lesson = await this.lessonRepository.findById(payload.lessonId);
    if (!lesson) {
      throw new AppError("Lesson not found", 404, "LESSON_NOT_FOUND");
    }

    const course = await this.courseRepository.findById(lesson.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const canManageCourse = user.role === USER_ROLE.admin || course.instructorId === user.id;
    if (!canManageCourse) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    return this.lessonRepository.update(payload.lessonId, {
      title: payload.title,
      contentType: payload.contentType,
      content: payload.content
    });
  }

  async deleteLesson(user: Express.UserClaims | undefined, lessonId: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson) {
      throw new AppError("Lesson not found", 404, "LESSON_NOT_FOUND");
    }

    const course = await this.courseRepository.findById(lesson.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const canManageCourse = user.role === USER_ROLE.admin || course.instructorId === user.id;
    if (!canManageCourse) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    return this.lessonRepository.delete(lessonId, lesson.courseId, lesson.sortOrder);
  }
}
