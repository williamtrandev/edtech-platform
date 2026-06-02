import { Request, Response } from "express";
import { CourseStatus } from "@prisma/client";
import { CourseService } from "./course.service";

export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  listCourses = async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const status = req.query.status as CourseStatus | undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const courses = await this.courseService.listCourses(req.user, page, limit, status, search, {
      category: typeof req.query.category === "string" ? req.query.category : undefined,
      level: typeof req.query.level === "string" ? req.query.level : undefined,
      language: typeof req.query.language === "string" ? req.query.language : undefined,
      instructorId: typeof req.query.instructorId === "string" ? req.query.instructorId : undefined,
      enrollment: req.query.enrollment as "all" | "enrolled" | "not-enrolled" | undefined,
      sort: req.query.sort as "newest" | "oldest" | "popular" | "highest-rated" | "title" | undefined
    });
    res.status(200).json({ success: true, data: courses });
  };

  listCourseFacets = async (req: Request, res: Response): Promise<void> => {
    const status = req.query.status as CourseStatus | undefined;
    const facets = await this.courseService.listCourseFacets(req.user, status);
    res.status(200).json({ success: true, data: facets });
  };

  listCourseEnrollments = async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const enrollments = await this.courseService.listCourseEnrollments(req.user, req.params.id, page, limit, search);
    res.status(200).json({ success: true, data: enrollments });
  };

  getCourseAnalytics = async (req: Request, res: Response): Promise<void> => {
    const analytics = await this.courseService.getCourseAnalytics(req.user, req.params.id);
    res.status(200).json({ success: true, data: analytics });
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

  assignCourseInstructor = async (req: Request, res: Response): Promise<void> => {
    const course = await this.courseService.assignCourseInstructor(req.user, req.params.id, req.body.instructorId);
    res.status(200).json({ success: true, data: course });
  };

  getCourseArchiveImpact = async (req: Request, res: Response): Promise<void> => {
    const impact = await this.courseService.getCourseArchiveImpact(req.user, req.params.id);
    res.status(200).json({ success: true, data: impact });
  };

  archiveCourse = async (req: Request, res: Response): Promise<void> => {
    const course = await this.courseService.archiveCourse(req.user, req.params.id);
    res.status(200).json({ success: true, data: course });
  };

  lockCourse = async (req: Request, res: Response): Promise<void> => {
    const course = await this.courseService.lockCourse(req.user, req.params.id, req.body.reason);
    res.status(200).json({ success: true, data: course });
  };

  unlockCourse = async (req: Request, res: Response): Promise<void> => {
    const course = await this.courseService.unlockCourse(req.user, req.params.id);
    res.status(200).json({ success: true, data: course });
  };
}
