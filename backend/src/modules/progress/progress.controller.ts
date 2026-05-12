import { Request, Response } from "express";
import { ProgressService } from "./progress.service";

export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  upsertLessonProgress = async (req: Request, res: Response): Promise<void> => {
    const progress = await this.progressService.upsertLessonProgress(req.user, req.body);
    res.status(200).json({ success: true, data: progress });
  };

  getMyCourseProgress = async (req: Request, res: Response): Promise<void> => {
    const progress = await this.progressService.getMyCourseProgress(req.user, req.params.courseId);
    res.status(200).json({ success: true, data: progress });
  };
}
