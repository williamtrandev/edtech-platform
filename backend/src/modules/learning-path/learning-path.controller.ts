import { Request, Response } from "express";
import { LearningPathService } from "./learning-path.service";

export class LearningPathController {
  constructor(private readonly learningPathService: LearningPathService) {}

  listLearningPaths = async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const status = req.query.status ? String(req.query.status) : undefined;
    const data = await this.learningPathService.listLearningPaths(req.user, page, limit, status);
    res.status(200).json({ success: true, data });
  };

  getLearningPath = async (req: Request, res: Response): Promise<void> => {
    const data = await this.learningPathService.getLearningPath(req.user, req.params.id);
    res.status(200).json({ success: true, data });
  };

  createLearningPath = async (req: Request, res: Response): Promise<void> => {
    const data = await this.learningPathService.createLearningPath(req.user, req.body);
    res.status(201).json({ success: true, data });
  };

  updateLearningPath = async (req: Request, res: Response): Promise<void> => {
    const data = await this.learningPathService.updateLearningPath(req.user, req.params.id, req.body);
    res.status(200).json({ success: true, data });
  };

  addCourseToPath = async (req: Request, res: Response): Promise<void> => {
    const data = await this.learningPathService.addCourseToPath(req.user, req.params.id, req.body.courseId, req.body.sortOrder);
    res.status(201).json({ success: true, data });
  };

  removeCourseFromPath = async (req: Request, res: Response): Promise<void> => {
    const data = await this.learningPathService.removeCourseFromPath(req.user, req.params.id, req.params.courseId);
    res.status(200).json({ success: true, data });
  };
}
