import { Request, Response } from "express";
import { LiveSessionService } from "./live-session.service";

export class LiveSessionController {
  constructor(private readonly liveSessionService: LiveSessionService) {}

  listMyLiveSessions = async (req: Request, res: Response): Promise<void> => {
    const status = String(req.query.status ?? "ALL");
    const limit = Number(req.query.limit ?? 20);
    const sessions = await this.liveSessionService.listMyLiveSessions(req.user, status as "ALL", limit);
    res.status(200).json({ success: true, data: sessions });
  };

  listCourseLiveSessions = async (req: Request, res: Response): Promise<void> => {
    const sessions = await this.liveSessionService.listCourseLiveSessions(req.user, req.params.id);
    res.status(200).json({ success: true, data: sessions });
  };
}
