import { USER_ROLE } from "../../common/constants/business";
import { LEARNING_PATH_STATUS } from "../../common/constants/learning-path";
import { AppError } from "../../common/errors/app-error";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { CourseProgressService } from "../progress/course-progress.service";
import { LearningPathRepository } from "./learning-path.repository";

type CreateLearningPathPayload = {
  title: string;
  description?: string | null;
  coverImageUrl?: string | null;
  status?: typeof LEARNING_PATH_STATUS.draft | typeof LEARNING_PATH_STATUS.published | typeof LEARNING_PATH_STATUS.archived;
};

type UpdateLearningPathPayload = Partial<CreateLearningPathPayload>;

export class LearningPathService {
  constructor(
    private readonly learningPathRepository: LearningPathRepository,
    private readonly courseRepository: CourseRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly courseProgressService: CourseProgressService
  ) {}

  async listLearningPaths(user: Express.UserClaims | undefined, page: number, limit: number, status?: string) {
    const canManage = user?.role === USER_ROLE.admin || user?.role === USER_ROLE.instructor;
    const effectiveStatus = canManage
      ? (status as typeof LEARNING_PATH_STATUS.draft | undefined)
      : LEARNING_PATH_STATUS.published;
    const { items, total } = await this.learningPathRepository.findMany(page, limit, effectiveStatus);

    return {
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        coverImageUrl: item.coverImageUrl,
        status: item.status,
        courseCount: item.courseCount,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })),
      pagination: {
        page,
        limit,
        total
      }
    };
  }

  async getLearningPath(user: Express.UserClaims | undefined, id: string) {
    const path = await this.learningPathRepository.findById(id);
    if (!path) {
      throw new AppError("Learning path not found", 404, "LEARNING_PATH_NOT_FOUND");
    }

    const canManage = user?.role === USER_ROLE.admin || user?.role === USER_ROLE.instructor;
    if (!canManage && path.status !== LEARNING_PATH_STATUS.published) {
      throw new AppError("Learning path is not available", 403, "FORBIDDEN");
    }

    const courses = await Promise.all(
      path.courses.map(async (entry) => {
        const base = {
          sortOrder: entry.sortOrder,
          course: entry.course
        };

        if (!user?.id) {
          return {
            ...base,
            isEnrolled: false,
            progressPercent: 0
          };
        }

        const enrollment = await this.enrollmentRepository.findByUserAndCourse(user.id, entry.course.id);
        if (!enrollment) {
          return {
            ...base,
            isEnrolled: false,
            progressPercent: 0
          };
        }

        const snapshot = await this.courseProgressService.getSnapshot(user.id, entry.course.id);
        return {
          ...base,
          isEnrolled: true,
          progressPercent: snapshot.percentage
        };
      })
    );

    const enrolledCourseCount = courses.filter((entry) => entry.isEnrolled).length;
    const averageProgress =
      enrolledCourseCount > 0
        ? Math.round(courses.filter((entry) => entry.isEnrolled).reduce((sum, entry) => sum + entry.progressPercent, 0) / enrolledCourseCount)
        : 0;

    return {
      id: path.id,
      title: path.title,
      description: path.description,
      coverImageUrl: path.coverImageUrl,
      status: path.status,
      courseCount: path.courseCount,
      createdAt: path.createdAt,
      updatedAt: path.updatedAt,
      enrolledCourseCount,
      averageProgress,
      courses
    };
  }

  async createLearningPath(user: Express.UserClaims | undefined, payload: CreateLearningPathPayload) {
    this.assertCanManage(user);
    const created = await this.learningPathRepository.create({
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      coverImageUrl: payload.coverImageUrl ?? null,
      status: payload.status ?? LEARNING_PATH_STATUS.draft,
      createdById: user!.id
    });

    return {
      ...created,
      courseCount: created._count.courses
    };
  }

  async updateLearningPath(user: Express.UserClaims | undefined, id: string, payload: UpdateLearningPathPayload) {
    this.assertCanManage(user);
    const existing = await this.learningPathRepository.findById(id);
    if (!existing) {
      throw new AppError("Learning path not found", 404, "LEARNING_PATH_NOT_FOUND");
    }

    const updated = await this.learningPathRepository.update(id, {
      ...(payload.title !== undefined ? { title: payload.title.trim() } : {}),
      ...(payload.description !== undefined ? { description: payload.description?.trim() || null } : {}),
      ...(payload.coverImageUrl !== undefined ? { coverImageUrl: payload.coverImageUrl } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {})
    });

    return {
      ...updated,
      courseCount: updated._count.courses
    };
  }

  async addCourseToPath(user: Express.UserClaims | undefined, learningPathId: string, courseId: string, sortOrder?: number) {
    this.assertCanManage(user);
    const path = await this.learningPathRepository.findById(learningPathId);
    if (!path) {
      throw new AppError("Learning path not found", 404, "LEARNING_PATH_NOT_FOUND");
    }

    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const existing = await this.learningPathRepository.findCourseLink(learningPathId, courseId);
    if (existing) {
      throw new AppError("Course already in learning path", 409, "LEARNING_PATH_COURSE_EXISTS");
    }

    const resolvedSortOrder = sortOrder ?? (await this.learningPathRepository.getNextSortOrder(learningPathId));
    return this.learningPathRepository.addCourse(learningPathId, courseId, resolvedSortOrder);
  }

  async removeCourseFromPath(user: Express.UserClaims | undefined, learningPathId: string, courseId: string) {
    this.assertCanManage(user);
    const path = await this.learningPathRepository.findById(learningPathId);
    if (!path) {
      throw new AppError("Learning path not found", 404, "LEARNING_PATH_NOT_FOUND");
    }

    await this.learningPathRepository.removeCourse(learningPathId, courseId);
    return { learningPathId, courseId };
  }

  private assertCanManage(user: Express.UserClaims | undefined) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    if (user.role !== USER_ROLE.admin && user.role !== USER_ROLE.instructor) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
  }
}
