import { Request, Response } from "express";
import { AuthService } from "./auth.service";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  getCurrentSession = async (req: Request, res: Response): Promise<void> => {
    const session = await this.authService.getCurrentSession(req.user);
    res.status(200).json({ success: true, data: session });
  };

  createSession = async (req: Request, res: Response): Promise<void> => {
    const session = await this.authService.createSession(req.user, req.body);
    res.status(201).json({ success: true, data: session });
  };
}
