import { redisConnection } from "../../config/redis";
import { AppError } from "../../common/errors/app-error";
import { USER_ROLE } from "../../common/constants/business";
import { LESSON_ERROR_CODE } from "../../common/constants/lesson";
import { PROGRESS_SYNC } from "../../common/constants/progress-sync";
import { buildLessonUnlockMap, getLessonUnlockState } from "../../common/lesson-prerequisite/lesson-prerequisite";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { CertificateEligibilityService } from "./certificate-eligibility.service";
import { CourseProgressService } from "./course-progress.service";
import { ProgressRepository } from "./progress.repository";

export class ProgressService {
  constructor(
    private readonly progressRepository: ProgressRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly courseRepository: CourseRepository,
    private readonly courseProgressService: CourseProgressService,
    private readonly certificateEligibilityService?: CertificateEligibilityService
  ) {}

  async upsertLessonProgress(user: Express.UserClaims | undefined, payload: { lessonId: string; isCompleted?: boolean; watchPositionSeconds?: number }) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const lesson = await this.progressRepository.findLessonById(payload.lessonId);
    if (!lesson) {
      throw new AppError("Lesson not found", 404, "LESSON_NOT_FOUND");
    }

    if (lesson.archivedAt) {
      throw new AppError("Lesson is archived", 404, LESSON_ERROR_CODE.archived);
    }

    const course = await this.courseRepository.findById(lesson.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const isCourseOwnerOrAdmin = user.role === USER_ROLE.admin || course.instructorId === user.id;
    if (!isCourseOwnerOrAdmin) {
      const enrollment = await this.enrollmentRepository.findByUserAndCourse(user.id, lesson.courseId);
      if (!enrollment) {
        throw new AppError("Forbidden", 403, "COURSE_ACCESS_DENIED");
      }

      await this.assertLessonUnlockedForLearner(user.id, payload.lessonId, lesson.courseId);
    }

    if (payload.watchPositionSeconds !== undefined && payload.isCompleted === undefined) {
      return this.progressRepository.upsertWatchPosition(user.id, payload.lessonId, payload.watchPositionSeconds);
    }

    if (payload.isCompleted === undefined) {
      throw new AppError("Invalid progress payload", 422, "VALIDATION_ERROR");
    }

    if (payload.watchPositionSeconds !== undefined) {
      await this.progressRepository.upsertWatchPosition(user.id, payload.lessonId, payload.watchPositionSeconds);
    }

    const progress = await this.progressRepository.upsertLessonProgress(user.id, payload.lessonId, payload.isCompleted);
    if (payload.isCompleted) {
      if (!isCourseOwnerOrAdmin) {
        const enrollment = await this.enrollmentRepository.findByUserAndCourse(user.id, lesson.courseId);
        if (enrollment) {
          await this.certificateEligibilityService?.tryIssueCertificateIfEligible(user.id, lesson.courseId);
        }
      }
    }

    return progress;
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

    const snapshot = await this.courseProgressService.getSnapshot(user.id, courseId);

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

  async syncLessonProgress(
    user: Express.UserClaims | undefined,
    payload: {
      items: Array<{
        clientEventId: string;
        lessonId: string;
        isCompleted?: boolean;
        watchPositionSeconds?: number;
        recordedAt?: string;
      }>;
    }
  ) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    if (payload.items.length > PROGRESS_SYNC.maxBatchSize) {
      throw new AppError("Too many progress events in one sync batch", 422, "PROGRESS_SYNC_BATCH_TOO_LARGE");
    }

    const mergedByLesson = new Map<string, { isCompleted?: boolean; watchPositionSeconds?: number }>();
    let skippedDuplicates = 0;

    for (const item of payload.items) {
      const idempotencyKey = `idempotency:progress-sync:${user.id}:${item.clientEventId.trim()}`;
      const cached = await redisConnection.get(idempotencyKey);
      if (cached) {
        skippedDuplicates += 1;
        continue;
      }

      await redisConnection.set(idempotencyKey, "1", "EX", PROGRESS_SYNC.idempotencyTtlSeconds);

      const existing = mergedByLesson.get(item.lessonId) ?? {};
      const nextWatch =
        item.watchPositionSeconds !== undefined
          ? Math.max(existing.watchPositionSeconds ?? 0, item.watchPositionSeconds)
          : existing.watchPositionSeconds;

      mergedByLesson.set(item.lessonId, {
        isCompleted: existing.isCompleted === true || item.isCompleted === true ? true : undefined,
        watchPositionSeconds: nextWatch
      });
    }

    const results: Array<{ lessonId: string; progress: Awaited<ReturnType<ProgressRepository["upsertLessonProgress"]>> }> = [];
    const failures: Array<{ lessonId: string; code: string; message: string }> = [];

    for (const [lessonId, merged] of mergedByLesson.entries()) {
      if (merged.isCompleted === undefined && merged.watchPositionSeconds === undefined) {
        continue;
      }

      try {
        const progress = await this.upsertLessonProgress(user, {
          lessonId,
          isCompleted: merged.isCompleted,
          watchPositionSeconds: merged.watchPositionSeconds
        });
        results.push({ lessonId, progress });
      } catch (error) {
        if (error instanceof AppError) {
          failures.push({
            lessonId,
            code: error.code,
            message: error.message
          });
          continue;
        }

        failures.push({
          lessonId,
          code: "PROGRESS_SYNC_FAILED",
          message: "Could not sync lesson progress"
        });
      }
    }

    return {
      synced: results.length,
      skippedDuplicates,
      failures,
      results
    };
  }

  async getMyLessonProgress(user: Express.UserClaims | undefined, courseId: string) {
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

    const [lessons, progressRows, completedLessonIds] = await Promise.all([
      this.progressRepository.findCourseLessonsForUnlock(courseId),
      this.progressRepository.findMyLessonProgressByCourse(user.id, courseId),
      this.progressRepository.findCompletedLessonIdsByCourse(user.id, courseId)
    ]);

    const progressByLessonId = new Map(progressRows.map((row) => [row.lessonId, row]));
    const unlockByLessonId = buildLessonUnlockMap(lessons, completedLessonIds);

    const items = lessons.map((lesson) => {
      const progress = progressByLessonId.get(lesson.id);
      const unlock = unlockByLessonId.get(lesson.id);

      return {
        lessonId: lesson.id,
        isCompleted: progress?.isCompleted ?? false,
        watchPositionSeconds: progress?.watchPositionSeconds ?? 0,
        completedAt: progress?.completedAt ?? null,
        updatedAt: progress?.updatedAt ?? null,
        prerequisiteLessonId: lesson.prerequisiteLessonId,
        isUnlocked: unlock?.isUnlocked ?? true,
        lockedByLessonId: unlock?.lockedByLessonId ?? null,
        lockedByLessonTitle: unlock?.lockedByLessonTitle ?? null
      };
    });

    return { courseId, items };
  }

  private async assertLessonUnlockedForLearner(userId: string, lessonId: string, courseId: string) {
    const lessons = await this.progressRepository.findCourseLessonsForUnlock(courseId);
    const completedLessonIds = await this.progressRepository.findCompletedLessonIdsByCourse(userId, courseId);
    const unlock = getLessonUnlockState(lessonId, lessons, completedLessonIds);

    if (!unlock?.isUnlocked) {
      throw new AppError("Complete the prerequisite lesson first", 403, LESSON_ERROR_CODE.lockedPrerequisite);
    }
  }
}
