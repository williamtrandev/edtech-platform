import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { AppError } from "../../common/errors/app-error";
import { assertCourseInstructor, canViewCourseAsStaff } from "../../common/auth/course-access";
import { COURSE_STATUS } from "../../common/constants/business";
import { LESSON_ERROR_CODE } from "../../common/constants/lesson";
import type { LessonContentType } from "../../common/constants/lesson-content";
import { validateAndNormalizeLessonContent } from "../../common/lesson-content/lesson-content-validation";
import { assertNoPrerequisiteCycle } from "../../common/lesson-prerequisite/lesson-prerequisite";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { ExamRepository } from "../exam/exam.repository";
import { LessonRepository } from "./lesson.repository";

type CreateLessonPayload = {
  courseId: string;
  title: string;
  contentType: LessonContentType;
  content: string;
  sortOrder: number;
  progressWeight?: number;
  prerequisiteLessonId?: string | null;
};

type UpdateLessonOrderPayload = {
  lessonId: string;
  sortOrder: number;
};

type UpdateLessonPayload = {
  lessonId: string;
  title: string;
  contentType: LessonContentType;
  content: string;
  progressWeight?: number;
  prerequisiteLessonId?: string | null;
};

export class LessonService {
  constructor(
    private readonly lessonRepository: LessonRepository,
    private readonly courseRepository: CourseRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly examRepository: ExamRepository
  ) {}

  private assertCourseEditable(user: Express.UserClaims, course: { status: string }) {
    if (course.status === COURSE_STATUS.locked) {
      throw new AppError("Course is locked and cannot be edited", 409, "COURSE_LOCKED");
    }
  }

  private async resolvePrerequisiteLessonId(
    courseId: string,
    lessonId: string | null,
    prerequisiteLessonId: string | null | undefined
  ): Promise<string | null> {
    if (prerequisiteLessonId === undefined) {
      return null;
    }

    if (prerequisiteLessonId === null) {
      return null;
    }

    const lessons = await this.lessonRepository.findByCourseId(courseId, { activeOnly: true });
    const prerequisite = lessons.find((lesson) => lesson.id === prerequisiteLessonId);

    if (!prerequisite) {
      throw new AppError("Prerequisite lesson not found in this course", 404, LESSON_ERROR_CODE.prerequisiteNotFound);
    }

    if (prerequisite.archivedAt) {
      throw new AppError("Prerequisite lesson is archived", 422, LESSON_ERROR_CODE.archived);
    }

    if (prerequisite.courseId !== courseId) {
      throw new AppError("Prerequisite lesson must belong to the same course", 422, LESSON_ERROR_CODE.prerequisiteWrongCourse);
    }

    if (lessonId) {
      try {
        assertNoPrerequisiteCycle(lessonId, prerequisiteLessonId, lessons);
      } catch (error: unknown) {
        if (error instanceof Error) {
          if (error.message === "LESSON_PREREQUISITE_SELF") {
            throw new AppError("A lesson cannot require itself", 422, LESSON_ERROR_CODE.prerequisiteSelf);
          }

          if (error.message === "LESSON_PREREQUISITE_CYCLE") {
            throw new AppError("Prerequisite would create a dependency cycle", 422, LESSON_ERROR_CODE.prerequisiteCycle);
          }
        }

        throw error;
      }
    }

    return prerequisiteLessonId;
  }

  async listLessons(user: Express.UserClaims | undefined, courseId: string) {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    if (!user?.id) {
      throw new AppError("Sign in and enroll to access lessons", 403, "COURSE_ENROLLMENT_REQUIRED");
    }

    const canAccessCourse = canViewCourseAsStaff(user, course.instructorId);
    if (course.status === COURSE_STATUS.locked && !canAccessCourse) {
      throw new AppError("Course has been locked", 403, "COURSE_LOCKED");
    }
    if (!canAccessCourse) {
      const enrollment = await this.enrollmentRepository.findByUserAndCourse(user.id, courseId);
      if (!enrollment) {
        throw new AppError("Enroll in this course to access lessons", 403, "COURSE_ENROLLMENT_REQUIRED");
      }
    }

    const includeArchived = canViewCourseAsStaff(user, course.instructorId);
    return this.lessonRepository.findByCourseId(courseId, { activeOnly: !includeArchived });
  }

  async createLesson(user: Express.UserClaims | undefined, payload: CreateLessonPayload) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const course = await this.courseRepository.findById(payload.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    assertCourseInstructor(user, course.instructorId);
    this.assertCourseEditable(user, course);

    const prerequisiteLessonId = await this.resolvePrerequisiteLessonId(payload.courseId, null, payload.prerequisiteLessonId);
    const content = await validateAndNormalizeLessonContent(this.examRepository, {
      courseId: payload.courseId,
      contentType: payload.contentType,
      content: payload.content
    });

    try {
      return await this.lessonRepository.create({
        course: { connect: { id: payload.courseId } },
        title: payload.title,
        contentType: payload.contentType,
        content,
        sortOrder: payload.sortOrder,
        ...(payload.progressWeight !== undefined ? { progressWeight: payload.progressWeight } : {}),
        ...(prerequisiteLessonId ? { prerequisiteLesson: { connect: { id: prerequisiteLessonId } } } : {})
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

    if (lesson.archivedAt) {
      throw new AppError("Archived lessons cannot be reordered", 409, LESSON_ERROR_CODE.archived);
    }

    const course = await this.courseRepository.findById(lesson.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    assertCourseInstructor(user, course.instructorId);
    this.assertCourseEditable(user, course);

    const lessons = await this.lessonRepository.findByCourseId(lesson.courseId, { activeOnly: true });
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

    assertCourseInstructor(user, course.instructorId);
    this.assertCourseEditable(user, course);

    const lessons = await this.lessonRepository.findByCourseId(courseId, { activeOnly: true });
    const existingIds = new Set(lessons.map((lesson) => lesson.id));
    const requestedIds = new Set(lessonIds);
    if (lessonIds.length !== lessons.length || requestedIds.size !== lessonIds.length || lessonIds.some((lessonId) => !existingIds.has(lessonId))) {
      throw new AppError("Lesson order payload does not match active course lessons", 422, "LESSON_ORDER_MISMATCH");
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

    if (lesson.archivedAt) {
      throw new AppError("Restore the lesson before editing", 409, LESSON_ERROR_CODE.archived);
    }

    const course = await this.courseRepository.findById(lesson.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    assertCourseInstructor(user, course.instructorId);
    this.assertCourseEditable(user, course);

    const prerequisiteLessonId = await this.resolvePrerequisiteLessonId(
      lesson.courseId,
      payload.lessonId,
      payload.prerequisiteLessonId
    );
    const content = await validateAndNormalizeLessonContent(this.examRepository, {
      courseId: lesson.courseId,
      contentType: payload.contentType,
      content: payload.content
    });

    return this.lessonRepository.update(payload.lessonId, {
      title: payload.title,
      contentType: payload.contentType,
      content,
      ...(payload.progressWeight !== undefined ? { progressWeight: payload.progressWeight } : {}),
      ...(payload.prerequisiteLessonId !== undefined
        ? prerequisiteLessonId
          ? { prerequisiteLesson: { connect: { id: prerequisiteLessonId } } }
          : { prerequisiteLesson: { disconnect: true } }
        : {})
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

    assertCourseInstructor(user, course.instructorId);
    this.assertCourseEditable(user, course);

    if (lesson.archivedAt) {
      throw new AppError("Lesson is already archived", 409, LESSON_ERROR_CODE.archived);
    }

    return this.lessonRepository.archive(lessonId, lesson.courseId, lesson.sortOrder);
  }

  async restoreLesson(user: Express.UserClaims | undefined, lessonId: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson) {
      throw new AppError("Lesson not found", 404, "LESSON_NOT_FOUND");
    }

    if (!lesson.archivedAt) {
      throw new AppError("Lesson is not archived", 409, LESSON_ERROR_CODE.notArchived);
    }

    const course = await this.courseRepository.findById(lesson.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    assertCourseInstructor(user, course.instructorId);
    this.assertCourseEditable(user, course);

    return this.lessonRepository.restore(lessonId, lesson.courseId);
  }
}
