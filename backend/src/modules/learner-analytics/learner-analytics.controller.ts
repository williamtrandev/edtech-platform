import { Request, Response } from "express";
import { LearnerAnalyticsService } from "./learner-analytics.service";

export class LearnerAnalyticsController {
  constructor(private readonly learnerAnalyticsService: LearnerAnalyticsService) {}

  getMyAnalytics = async (req: Request, res: Response): Promise<void> => {
    const data = await this.learnerAnalyticsService.getMyAnalytics(req.user);
    res.status(200).json({ success: true, data });
  };

  getMyCourseAnalytics = async (req: Request, res: Response): Promise<void> => {
    const data = await this.learnerAnalyticsService.getMyCourseAnalytics(req.user, req.params.courseId);
    res.status(200).json({ success: true, data });
  };
}
