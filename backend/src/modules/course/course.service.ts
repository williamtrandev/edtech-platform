import { CourseStatus } from "@prisma/client";
import { AppError } from "../../common/errors/app-error";
import { COURSE_STATUS, USER_ROLE } from "../../common/constants/business";
import { CourseRepository } from "./course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";

type CoursePayload = {
  title: string;
  description?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

export class CourseService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly enrollmentRepository: EnrollmentRepository
  ) {}

  async listCourses(
    user: Express.UserClaims | undefined,
    page: number,
    limit: number,
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  ) {
    let effectiveStatus: CourseStatus | undefined = CourseStatus.PUBLISHED;
    if (!user?.id || user.role === USER_ROLE.user) {
      effectiveStatus = CourseStatus.PUBLISHED;
    } else if (status) {
      effectiveStatus = status;
    } else {
      effectiveStatus = undefined;
    }

    const { items, total } = await this.courseRepository.findMany(page, limit, effectiveStatus);
    return {
      items,
      pagination: {
        page,
        limit,
        total
      }
    };
  }

  async getCourseById(user: Express.UserClaims | undefined, id: string) {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const canViewUnpublished = user?.role === USER_ROLE.admin || course.instructorId === user?.id;
    if (!canViewUnpublished && course.status !== COURSE_STATUS.published) {
      throw new AppError("Course is not available", 403, "FORBIDDEN");
    }

    return course;
  }

  async createCourse(user: Express.UserClaims | undefined, payload: CoursePayload) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const canCreate = user.role === USER_ROLE.instructor || user.role === USER_ROLE.admin;
    if (!canCreate) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    return this.courseRepository.create({
      title: payload.title,
      description: payload.description,
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

    const canManageCourse = user.role === USER_ROLE.admin || course.instructorId === user.id;
    if (!canManageCourse) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const data: {
      title?: string;
      description?: string | null;
      status?: CourseStatus;
      archivedAt?: Date | null;
    } = {};

    if (payload.title !== undefined) {
      data.title = payload.title;
    }
    if (payload.description !== undefined) {
      data.description = payload.description;
    }
    if (payload.status !== undefined) {
      data.status = payload.status;
      if (payload.status === COURSE_STATUS.archived) {
        data.archivedAt = new Date();
      } else if (course.status === COURSE_STATUS.archived) {
        data.archivedAt = null;
      }
    }

    return this.courseRepository.update(id, data);
  }

  async archiveCourse(user: Express.UserClaims | undefined, id: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const canManageCourse = user.role === USER_ROLE.admin || course.instructorId === user.id;
    if (!canManageCourse) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    if (course.status === COURSE_STATUS.archived) {
      return course;
    }

    return this.courseRepository.archiveById(id);
  }

  async listCourseEnrollments(user: Express.UserClaims | undefined, courseId: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const canView = user.role === USER_ROLE.admin || course.instructorId === user.id;
    if (!canView) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    return this.enrollmentRepository.findByCourseId(courseId);
  }
}
