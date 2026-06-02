import { COURSE_STATUS, USER_ROLE } from "../../common/constants/business";
import { DISCUSSION_COMMENT_ERROR_CODE } from "../../common/constants/discussion-comment";
import { AppError } from "../../common/errors/app-error";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { LessonRepository } from "../lesson/lesson.repository";
import { CourseDiscussionRepository } from "./course-discussion.repository";

export class CourseDiscussionService {
  constructor(
    private readonly courseDiscussionRepository: CourseDiscussionRepository,
    private readonly courseRepository: CourseRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly lessonRepository: LessonRepository
  ) {}

  async listComments(
    user: Express.UserClaims | undefined,
    courseId: string,
    lessonId: string | undefined,
    page: number,
    limit: number
  ) {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    await this.assertCanAccessDiscussion(user, course);

    if (lessonId) {
      const lesson = await this.lessonRepository.findById(lessonId);
      if (!lesson || lesson.courseId !== courseId) {
        throw new AppError("Lesson not found in this course", 404, DISCUSSION_COMMENT_ERROR_CODE.invalidLesson);
      }
    }

    const { items, total } = await this.courseDiscussionRepository.findTopLevelByCourse(courseId, lessonId, page, limit);
    return {
      items,
      pagination: {
        page,
        limit,
        total
      }
    };
  }

  async createComment(
    user: Express.UserClaims | undefined,
    courseId: string,
    payload: { lessonId?: string | null; parentId?: string | null; body: string }
  ) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    await this.assertCanParticipate(user, course);

    const lessonId = payload.lessonId?.trim() || null;
    if (lessonId) {
      const lesson = await this.lessonRepository.findById(lessonId);
      if (!lesson || lesson.courseId !== courseId) {
        throw new AppError("Lesson not found in this course", 404, DISCUSSION_COMMENT_ERROR_CODE.invalidLesson);
      }
    }

    const parentId = payload.parentId?.trim() || null;
    let resolvedLessonId = lessonId;
    if (parentId) {
      const parent = await this.courseDiscussionRepository.findById(parentId);
      if (!parent || parent.courseId !== courseId) {
        throw new AppError("Parent comment not found", 404, DISCUSSION_COMMENT_ERROR_CODE.invalidParent);
      }
      if (parent.parentId) {
        throw new AppError("Replies cannot be nested deeper than one level", 422, DISCUSSION_COMMENT_ERROR_CODE.invalidParent);
      }
      if (lessonId && parent.lessonId && parent.lessonId !== lessonId) {
        throw new AppError("Reply lesson scope must match parent comment", 422, DISCUSSION_COMMENT_ERROR_CODE.invalidParent);
      }
      resolvedLessonId = parent.lessonId;
    }

    return this.courseDiscussionRepository.createComment({
      courseId,
      lessonId: resolvedLessonId,
      userId: user.id,
      parentId,
      body: payload.body.trim()
    });
  }

  async deleteComment(user: Express.UserClaims | undefined, courseId: string, commentId: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const comment = await this.courseDiscussionRepository.findById(commentId);
    if (!comment || comment.courseId !== courseId) {
      throw new AppError("Comment not found", 404, DISCUSSION_COMMENT_ERROR_CODE.notFound);
    }

    const isAuthor = comment.userId === user.id;
    const isManager = user.role === USER_ROLE.admin || course.instructorId === user.id;
    if (!isAuthor && !isManager) {
      throw new AppError("Forbidden", 403, DISCUSSION_COMMENT_ERROR_CODE.forbidden);
    }

    await this.courseDiscussionRepository.deleteComment(commentId);
  }

  private async assertCanAccessDiscussion(
    user: Express.UserClaims | undefined,
    course: { id: string; instructorId: string; status: string }
  ) {
    const canViewUnpublished = user?.role === USER_ROLE.admin || course.instructorId === user?.id;
    if (!canViewUnpublished && course.status !== COURSE_STATUS.published) {
      throw new AppError("Course is not available", 403, DISCUSSION_COMMENT_ERROR_CODE.forbidden);
    }

    if (canViewUnpublished) {
      return;
    }

    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const enrollment = await this.enrollmentRepository.findByUserAndCourse(user.id, course.id);
    if (!enrollment) {
      throw new AppError("Enroll in this course to view discussion", 403, DISCUSSION_COMMENT_ERROR_CODE.enrollmentRequired);
    }
  }

  private async assertCanParticipate(
    user: Express.UserClaims,
    course: { id: string; instructorId: string; status: string }
  ) {
    if (user.role === USER_ROLE.admin || course.instructorId === user.id) {
      return;
    }

    if (course.status !== COURSE_STATUS.published) {
      throw new AppError("Course is not open for discussion", 409, "COURSE_NOT_PUBLISHED");
    }

    const enrollment = await this.enrollmentRepository.findByUserAndCourse(user.id, course.id);
    if (!enrollment) {
      throw new AppError("Enroll in this course to join discussion", 403, DISCUSSION_COMMENT_ERROR_CODE.enrollmentRequired);
    }
  }
}
