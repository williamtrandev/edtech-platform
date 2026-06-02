import { Request, Response } from "express";
import { NotificationType } from "@prisma/client";
import { NotificationService } from "./notification.service";

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  listMyNotifications = async (req: Request, res: Response): Promise<void> => {
    const notifications = await this.notificationService.listMyNotifications(
      req.user,
      Number(req.query.page ?? 1),
      Number(req.query.limit ?? 10),
      req.query.unreadOnly === "true"
    );
    res.status(200).json({ success: true, data: notifications });
  };

  getMyPreferences = async (req: Request, res: Response): Promise<void> => {
    const preferences = await this.notificationService.getMyPreferences(req.user);
    res.status(200).json({ success: true, data: preferences });
  };

  updateMyPreferences = async (req: Request, res: Response): Promise<void> => {
    const preferences = await this.notificationService.updateMyPreferences(req.user, req.body);
    res.status(200).json({ success: true, data: preferences });
  };

  markMyNotificationRead = async (req: Request, res: Response): Promise<void> => {
    const notification = await this.notificationService.markMyNotificationRead(req.user, req.params.id);
    res.status(200).json({ success: true, data: notification });
  };

  markAllMyNotificationsRead = async (req: Request, res: Response): Promise<void> => {
    const result = await this.notificationService.markAllMyNotificationsRead(req.user);
    res.status(200).json({ success: true, data: result });
  };

  listPlatformNotifications = async (req: Request, res: Response): Promise<void> => {
    const notifications = await this.notificationService.listPlatformNotifications(
      req.user,
      Number(req.query.page ?? 1),
      Number(req.query.limit ?? 20),
      {
        search: typeof req.query.search === "string" ? req.query.search : undefined,
        type: typeof req.query.type === "string" ? (req.query.type as NotificationType) : undefined,
        unreadOnly: req.query.unreadOnly === "true"
      }
    );
    res.status(200).json({ success: true, data: notifications });
  };

  getPlatformSummary = async (req: Request, res: Response): Promise<void> => {
    const summary = await this.notificationService.getPlatformSummary(req.user);
    res.status(200).json({ success: true, data: summary });
  };
}
