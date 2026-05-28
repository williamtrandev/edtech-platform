import type { Request, Response } from "express";
import { PlatformAnalyticsService } from "./platform-analytics.service";

export class PlatformAnalyticsController {
  constructor(private readonly platformAnalyticsService: PlatformAnalyticsService) {}

  getOverview = async (req: Request, res: Response): Promise<void> => {
    const overview = await this.platformAnalyticsService.getOverview(req.user);
    res.status(200).json({ success: true, data: overview });
  };
}
