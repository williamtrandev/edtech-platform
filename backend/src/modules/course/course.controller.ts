import { Request, Response } from "express";
import { CourseStatus } from "@prisma/client";
import { CourseService } from "./course.service";

export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  listCourses = async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const status = req.query.status as CourseStatus | undefined;
    const courses = await this.courseService.listCourses(req.user, page, limit, status);
    res.status(200).json({ success: true, data: courses });
  };

  listCourseEnrollments = async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const enrollments = await this.courseService.listCourseEnrollments(req.user, req.params.id, page, limit, search);
    res.status(200).json({ success: true, data: enrollments });
  };

  getCourseById = async (req: Request, res: Response): Promise<void> => {
    const course = await this.courseService.getCourseById(req.user, req.params.id);
    res.status(200).json({ success: true, data: course });
  };

  createCourse = async (req: Request, res: Response): Promise<void> => {
    const course = await this.courseService.createCourse(req.user, req.body);
    res.status(201).json({ success: true, data: course });
  };

  updateCourse = async (req: Request, res: Response): Promise<void> => {
    const course = await this.courseService.updateCourse(req.user, req.params.id, req.body);
    res.status(200).json({ success: true, data: course });
  };

  archiveCourse = async (req: Request, res: Response): Promise<void> => {
    const course = await this.courseService.archiveCourse(req.user, req.params.id);
    res.status(200).json({ success: true, data: course });
  };
}
