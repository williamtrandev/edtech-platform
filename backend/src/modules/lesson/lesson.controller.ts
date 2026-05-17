import { Request, Response } from "express";
import { LessonService } from "./lesson.service";

export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  listLessonsByCourse = async (req: Request, res: Response): Promise<void> => {
    const lessons = await this.lessonService.listLessons(req.user, req.params.courseId);
    res.status(200).json({ success: true, data: lessons });
  };

  createLesson = async (req: Request, res: Response): Promise<void> => {
    const lesson = await this.lessonService.createLesson(req.user, req.body);
    res.status(201).json({ success: true, data: lesson });
  };

  updateLessonOrder = async (req: Request, res: Response): Promise<void> => {
    const lesson = await this.lessonService.updateLessonOrder(req.user, {
      lessonId: req.params.lessonId,
      sortOrder: req.body.sortOrder
    });
    res.status(200).json({ success: true, data: lesson });
  };

  reorderCourseLessons = async (req: Request, res: Response): Promise<void> => {
    const lessons = await this.lessonService.reorderCourseLessons(req.user, req.params.courseId, req.body.lessonIds);
    res.status(200).json({ success: true, data: lessons });
  };

  updateLesson = async (req: Request, res: Response): Promise<void> => {
    const lesson = await this.lessonService.updateLesson(req.user, {
      lessonId: req.params.lessonId,
      ...req.body
    });
    res.status(200).json({ success: true, data: lesson });
  };

  deleteLesson = async (req: Request, res: Response): Promise<void> => {
    const lesson = await this.lessonService.deleteLesson(req.user, req.params.lessonId);
    res.status(200).json({ success: true, data: lesson });
  };
}
