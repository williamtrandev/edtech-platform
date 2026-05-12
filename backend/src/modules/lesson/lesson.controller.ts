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
}
