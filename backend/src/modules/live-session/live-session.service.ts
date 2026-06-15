import { COURSE_STATUS, USER_ROLE } from "../../common/constants/business";
import { LESSON_CONTENT_TYPE, parseLessonContentPayload } from "../../common/constants/lesson-content";
import { LIVE_SESSION_STATUS, type LiveSessionStatus } from "../../common/constants/live-session";
import { resolveLiveSessionEndsAt, resolveLiveSessionStatus } from "../../common/live-session/live-session-status";
import { AppError } from "../../common/errors/app-error";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { LiveSessionRepository } from "./live-session.repository";

export type LiveSessionItem = {
  lessonId: string;
  courseId: string;
  courseTitle: string;
  lessonTitle: string;
  sortOrder: number;
  meetingUrl: string | null;
  instructions: string | null;
  startsAt: string | null;
  endsAt: string | null;
  durationMinutes: number | null;
  status: LiveSessionStatus;
  learnPath: string;
};

export class LiveSessionService {
  constructor(
    private readonly liveSessionRepository: LiveSessionRepository,
    private readonly courseRepository: CourseRepository,
    private readonly enrollmentRepository: EnrollmentRepository
  ) {}

  async listMyLiveSessions(
    user: Express.UserClaims | undefined,
    statusFilter: LiveSessionStatus | "ALL",
    limit: number
  ) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const enrollments = await this.enrollmentRepository.findByUser(user.id);
    const courseIds = enrollments.map((enrollment) => enrollment.courseId);
    const lessons = await this.liveSessionRepository.findLiveSessionLessonsByCourseIds(courseIds);
    const items = lessons
      .map((lesson) => this.toLiveSessionItem(lesson))
      .filter((item) => statusFilter === "ALL" || item.status === statusFilter)
      .sort((left, right) => this.compareBySchedule(left, right))
      .slice(0, limit);

    return { items };
  }

  async listCourseLiveSessions(user: Express.UserClaims | undefined, courseId: string) {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    await this.assertCanAccessCourseLiveSessions(user, course);

    const lessons = await this.liveSessionRepository.findLiveSessionLessonsByCourseId(courseId);
    const items = lessons.map((lesson) => this.toLiveSessionItem(lesson)).sort((left, right) => this.compareBySchedule(left, right));

    return { items };
  }

  private toLiveSessionItem(lesson: {
    id: string;
    courseId: string;
    title: string;
    content: string;
    sortOrder: number;
    course: { id: string; title: string };
  }): LiveSessionItem {
    const parsed = parseLessonContentPayload(lesson.content, LESSON_CONTENT_TYPE.liveSession);
    const startsAt = parsed.startsAt?.trim() || null;
    const durationMinutes = parsed.durationMinutes ?? null;
    const status = resolveLiveSessionStatus({ startsAt, durationMinutes });
    const endsAt = startsAt ? resolveLiveSessionEndsAt(startsAt, durationMinutes)?.toISOString() ?? null : null;

    return {
      lessonId: lesson.id,
      courseId: lesson.courseId,
      courseTitle: lesson.course.title,
      lessonTitle: lesson.title,
      sortOrder: lesson.sortOrder,
      meetingUrl: parsed.meetingUrl?.trim() || null,
      instructions: parsed.instructions?.trim() || null,
      startsAt,
      endsAt,
      durationMinutes,
      status,
      learnPath: `/courses/${lesson.courseId}/learn/${lesson.id}`
    };
  }

  private compareBySchedule(left: LiveSessionItem, right: LiveSessionItem) {
    const leftRank = this.scheduleRank(left.status);
    const rightRank = this.scheduleRank(right.status);
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    const leftTime = left.startsAt ? new Date(left.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
    const rightTime = right.startsAt ? new Date(right.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  }

  private scheduleRank(status: LiveSessionStatus) {
    if (status === LIVE_SESSION_STATUS.live) {
      return 0;
    }
    if (status === LIVE_SESSION_STATUS.upcoming) {
      return 1;
    }
    if (status === LIVE_SESSION_STATUS.unscheduled) {
      return 2;
    }
    return 3;
  }

  private async assertCanAccessCourseLiveSessions(
    user: Express.UserClaims | undefined,
    course: { id: string; instructorId: string; status: string }
  ) {
    const canManage = user?.role === USER_ROLE.admin || course.instructorId === user?.id;
    if (canManage) {
      return;
    }

    if (course.status !== COURSE_STATUS.published) {
      throw new AppError("Course is not available", 403, "FORBIDDEN");
    }

    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const enrollment = await this.enrollmentRepository.findByUserAndCourse(user.id, course.id);
    if (!enrollment) {
      throw new AppError("Enroll in this course to view live sessions", 403, "COURSE_ENROLLMENT_REQUIRED");
    }
  }
}
