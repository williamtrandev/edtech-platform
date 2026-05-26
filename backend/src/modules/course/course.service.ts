import { CourseStatus } from "@prisma/client";
import { AppError } from "../../common/errors/app-error";
import { assertCourseInstructor, canViewCourseAsStaff } from "../../common/auth/course-access";
import { COURSE_STATUS, USER_ROLE } from "../../common/constants/business";
import { AuditRepository } from "../audit/audit.repository";
import { CourseListFilters, CourseRepository } from "./course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";

type CoursePayload = {
  title: string;
  description?: string;
  category?: string | null;
  level?: string | null;
  language?: string | null;
  durationMinutes?: number | null;
  requirements?: string | null;
  outcomes?: string | null;
  coverImageUrl?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "LOCKED";
};

type PublishableCourse = {
  title?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  category?: string | null;
  level?: string | null;
  language?: string | null;
  durationMinutes?: number | null;
  requirements?: string | null;
  outcomes?: string | null;
};

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export class CourseService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly auditRepository?: AuditRepository
  ) {}

  async listCourses(
    user: Express.UserClaims | undefined,
    page: number,
    limit: number,
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "LOCKED",
    search?: string,
    filters: Omit<CourseListFilters, "learnerId"> = {}
  ) {
    let effectiveStatus: CourseStatus | undefined = CourseStatus.PUBLISHED;
    let effectiveFilters: Omit<CourseListFilters, "learnerId"> = filters;
    if (!user?.id || user.role === USER_ROLE.user) {
      effectiveStatus = CourseStatus.PUBLISHED;
    } else if (status) {
      effectiveStatus = status;
    } else {
      effectiveStatus = undefined;
      if (user.role === USER_ROLE.instructor) {
        effectiveFilters = {
          ...filters,
          instructorId: user.id
        };
      }
    }

    const { items, total } = await this.courseRepository.findMany(page, limit, effectiveStatus, search, {
      ...effectiveFilters,
      learnerId: effectiveFilters.enrollment && effectiveFilters.enrollment !== "all" ? user?.id : undefined
    });
    return {
      items,
      pagination: {
        page,
        limit,
        total
      }
    };
  }

  async listCourseFacets(user: Express.UserClaims | undefined, status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "LOCKED") {
    let effectiveStatus: CourseStatus | undefined = CourseStatus.PUBLISHED;
    if (!user?.id || user.role === USER_ROLE.user) {
      effectiveStatus = CourseStatus.PUBLISHED;
    } else if (status) {
      effectiveStatus = status;
    }

    return this.courseRepository.findFacets(effectiveStatus);
  }

  async getCourseById(user: Express.UserClaims | undefined, id: string) {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const canViewUnpublished = user?.role === USER_ROLE.admin || course.instructorId === user?.id;
    if (course.status === COURSE_STATUS.locked && !canViewUnpublished) {
      throw new AppError("Course has been locked", 403, "COURSE_LOCKED");
    }
    if (!canViewUnpublished && course.status !== COURSE_STATUS.published) {
      throw new AppError("Course is not available", 403, "FORBIDDEN");
    }

    return course;
  }

  async createCourse(user: Express.UserClaims | undefined, payload: CoursePayload) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const canCreate = user.role === USER_ROLE.instructor;
    if (!canCreate) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    this.assertCourseMetadataComplete(payload);

    if (payload.status === COURSE_STATUS.published) {
      this.assertPublishable(payload, 0);
    }

    return this.courseRepository.create({
      title: payload.title,
      description: payload.description,
      category: payload.category || null,
      level: payload.level || null,
      language: payload.language || null,
      durationMinutes: payload.durationMinutes ?? null,
      requirements: payload.requirements || null,
      outcomes: payload.outcomes || null,
      coverImageUrl: payload.coverImageUrl,
      status: payload.status,
      instructor: {
        connect: {
          id: user.id
        }
      }
    });
  }

  async updateCourse(user: Express.UserClaims | undefined, id: string, payload: Partial<CoursePayload>) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    assertCourseInstructor(user, course.instructorId);

    if (course.status === COURSE_STATUS.locked) {
      throw new AppError("Course is locked and cannot be edited", 409, "COURSE_LOCKED");
    }

    if (payload.status !== undefined && payload.status === COURSE_STATUS.locked) {
      throw new AppError("Use course lock endpoint for moderation", 422, "COURSE_LOCK_REQUIRES_ADMIN_ENDPOINT");
    }

    const data: {
      title?: string;
      description?: string | null;
      category?: string | null;
      level?: string | null;
      language?: string | null;
      durationMinutes?: number | null;
      requirements?: string | null;
      outcomes?: string | null;
      coverImageUrl?: string | null;
      status?: CourseStatus;
      archivedAt?: Date | null;
    } = {};

    if (payload.title !== undefined) {
      data.title = payload.title;
    }
    if (payload.description !== undefined) {
      data.description = payload.description;
    }
    if (payload.category !== undefined) {
      data.category = payload.category || null;
    }
    if (payload.level !== undefined) {
      data.level = payload.level || null;
    }
    if (payload.language !== undefined) {
      data.language = payload.language || null;
    }
    if (payload.durationMinutes !== undefined) {
      data.durationMinutes = payload.durationMinutes;
    }
    if (payload.requirements !== undefined) {
      data.requirements = payload.requirements || null;
    }
    if (payload.outcomes !== undefined) {
      data.outcomes = payload.outcomes || null;
    }
    if (payload.coverImageUrl !== undefined) {
      data.coverImageUrl = payload.coverImageUrl;
    }
    if (payload.status !== undefined) {
      data.status = payload.status;
      if (payload.status === COURSE_STATUS.archived) {
        data.archivedAt = new Date();
      } else if (course.status === COURSE_STATUS.archived) {
        data.archivedAt = null;
      }
    }

    const nextStatus = data.status ?? course.status;
    if (nextStatus === COURSE_STATUS.published) {
      const lessonCount = await this.courseRepository.countLessons(id);
      this.assertPublishable(
        {
          title: data.title ?? course.title,
          coverImageUrl: data.coverImageUrl === undefined ? course.coverImageUrl : data.coverImageUrl,
          category: data.category === undefined ? course.category : data.category,
          level: data.level === undefined ? course.level : data.level,
          language: data.language === undefined ? course.language : data.language,
          durationMinutes: data.durationMinutes === undefined ? course.durationMinutes : data.durationMinutes,
          requirements: data.requirements === undefined ? course.requirements : data.requirements,
          outcomes: data.outcomes === undefined ? course.outcomes : data.outcomes
        },
        lessonCount
      );
    }

    const updatedCourse = await this.courseRepository.update(id, data);
    if (data.status && data.status !== course.status) {
      await this.auditRepository?.create({
        actor: { connect: { id: user.id } },
        action: data.status === COURSE_STATUS.published ? "COURSE_PUBLISHED" : data.status === COURSE_STATUS.archived ? "COURSE_ARCHIVED" : "COURSE_STATUS_UPDATED",
        entityType: "Course",
        entityId: id,
        metadata: {
          before: { status: course.status },
          after: { status: data.status }
        }
      });
    }

    return updatedCourse;
  }

  private assertCourseMetadataComplete(course: PublishableCourse) {
    const missing: string[] = [];

    if (!hasText(course.title)) missing.push("title");
    if (!hasText(course.description)) missing.push("description");
    if (!hasText(course.coverImageUrl)) missing.push("coverImageUrl");
    if (!hasText(course.category)) missing.push("category");
    if (!hasText(course.level)) missing.push("level");
    if (!hasText(course.language)) missing.push("language");
    if (!course.durationMinutes || course.durationMinutes < 1) missing.push("durationMinutes");
    if (!hasText(course.requirements)) missing.push("requirements");
    if (!hasText(course.outcomes)) missing.push("outcomes");

    if (missing.length) {
      throw new AppError(`Course is missing required fields: ${missing.join(", ")}`, 422, "COURSE_METADATA_INCOMPLETE");
    }
  }

  private assertPublishable(course: PublishableCourse, lessonCount: number) {
    this.assertCourseMetadataComplete(course);

    if (lessonCount < 1) {
      throw new AppError("Course is missing publish requirements: lessons", 422, "COURSE_PUBLISH_REQUIREMENTS_MISSING");
    }
  }

  async archiveCourse(user: Express.UserClaims | undefined, id: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    assertCourseInstructor(user, course.instructorId);

    if (course.status === COURSE_STATUS.archived) {
      return course;
    }

    const archivedCourse = await this.courseRepository.archiveById(id);
    await this.auditRepository?.create({
      actor: { connect: { id: user.id } },
      action: "COURSE_ARCHIVED",
      entityType: "Course",
      entityId: id,
      metadata: {
        before: { status: course.status },
        after: { status: COURSE_STATUS.archived }
      }
    });

    return archivedCourse;
  }

  async lockCourse(user: Express.UserClaims | undefined, id: string, reason?: string | null) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    if (user.role !== USER_ROLE.admin) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }
    if (course.status === COURSE_STATUS.locked) {
      return course;
    }
    if (course.status === COURSE_STATUS.archived) {
      throw new AppError("Archived courses cannot be locked", 409, "COURSE_ALREADY_ARCHIVED");
    }

    const trimmedReason = reason?.trim() || null;
    const lockedCourse = await this.courseRepository.lockById(id, user.id, trimmedReason, course.status as CourseStatus);
    await this.auditRepository?.create({
      actor: { connect: { id: user.id } },
      action: "COURSE_LOCKED",
      entityType: "Course",
      entityId: id,
      metadata: {
        before: { status: course.status },
        after: { status: COURSE_STATUS.locked },
        reason: trimmedReason
      }
    });

    return lockedCourse;
  }

  async unlockCourse(user: Express.UserClaims | undefined, id: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    if (user.role !== USER_ROLE.admin) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }
    if (course.status !== COURSE_STATUS.locked) {
      return course;
    }

    const unlockedCourse = await this.courseRepository.unlockById(id);
    await this.auditRepository?.create({
      actor: { connect: { id: user.id } },
      action: "COURSE_UNLOCKED",
      entityType: "Course",
      entityId: id,
      metadata: {
        before: { status: COURSE_STATUS.locked, lockReason: course.lockReason },
        after: { status: unlockedCourse.status }
      }
    });

    return unlockedCourse;
  }

  async listCourseEnrollments(user: Express.UserClaims | undefined, courseId: string, page: number, limit: number, search?: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const canView = canViewCourseAsStaff(user, course.instructorId);
    if (!canView) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const { items, total } = await this.enrollmentRepository.findByCourseId(courseId, page, limit, search);
    return {
      items,
      pagination: {
        page,
        limit,
        total
      }
    };
  }
}
