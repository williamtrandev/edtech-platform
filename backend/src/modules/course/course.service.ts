import { AppError } from "../../common/errors/app-error";
import { USER_ROLE } from "../../common/constants/business";
import { CourseRepository } from "./course.repository";

type CoursePayload = {
  title: string;
  description?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

export class CourseService {
  constructor(private readonly courseRepository: CourseRepository) {}

  async listCourses(page: number, limit: number, status?: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
    const { items, total } = await this.courseRepository.findMany(page, limit, status);
    return {
      items,
      pagination: {
        page,
        limit,
        total
      }
    };
  }

  async getCourseById(id: string) {
    const course = await this.courseRepository.findById(id);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }
    return course;
  }

  async createCourse(user: Express.UserClaims | undefined, payload: CoursePayload) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    if (user.role !== USER_ROLE.admin && user.role !== USER_ROLE.instructor) {
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

    const course = await this.getCourseById(id);
    const canManageCourse = user.role === USER_ROLE.admin || course.instructorId === user.id;
    if (!canManageCourse) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    return this.courseRepository.update(id, payload);
  }
}
