import type { Request, Response } from "express";
import { PlatformAnalyticsService } from "./platform-analytics.service";

export class PlatformAnalyticsController {
  constructor(private readonly platformAnalyticsService: PlatformAnalyticsService) {}

  getOverview = async (req: Request, res: Response): Promise<void> => {
    const forceRefresh = req.query.forceRefresh === "true";
    const overview = await this.platformAnalyticsService.getOverview(req.user, forceRefresh);
    res.status(200).json({ success: true, data: overview });
  };
}
