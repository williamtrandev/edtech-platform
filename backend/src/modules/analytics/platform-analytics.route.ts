import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { PlatformAnalyticsController } from "./platform-analytics.controller";
import { getPlatformAnalyticsSchema } from "./platform-analytics.schema";
import { PlatformAnalyticsService } from "./platform-analytics.service";

const platformAnalyticsService = new PlatformAnalyticsService();
const platformAnalyticsController = new PlatformAnalyticsController(platformAnalyticsService);

export const platformAnalyticsRouter = Router();

platformAnalyticsRouter.use(authMiddleware);
platformAnalyticsRouter.get("/platform-overviews", validateRequest(getPlatformAnalyticsSchema), asyncHandler(platformAnalyticsController.getOverview));
