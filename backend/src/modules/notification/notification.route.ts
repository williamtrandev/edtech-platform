import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { NotificationController } from "./notification.controller";
import { NotificationRepository } from "./notification.repository";
import {
  listNotificationsSchema,
  listPlatformNotificationsSchema,
  notificationIdParamSchema,
  updateNotificationPreferencesSchema
} from "./notification.schema";
import { NotificationService } from "./notification.service";

const notificationRepository = new NotificationRepository();
const notificationService = new NotificationService(notificationRepository);
const notificationController = new NotificationController(notificationService);

export const notificationRouter = Router();

notificationRouter.use(authMiddleware);
notificationRouter.get("/", validateRequest(listNotificationsSchema), asyncHandler(notificationController.listMyNotifications));
notificationRouter.get("/platform/summary", asyncHandler(notificationController.getPlatformSummary));
notificationRouter.get(
  "/platform",
  validateRequest(listPlatformNotificationsSchema),
  asyncHandler(notificationController.listPlatformNotifications)
);
notificationRouter.get("/preferences", asyncHandler(notificationController.getMyPreferences));
notificationRouter.patch("/preferences", validateRequest(updateNotificationPreferencesSchema), asyncHandler(notificationController.updateMyPreferences));
notificationRouter.patch("/read-all", asyncHandler(notificationController.markAllMyNotificationsRead));
notificationRouter.patch("/:id/read", validateRequest(notificationIdParamSchema), asyncHandler(notificationController.markMyNotificationRead));
