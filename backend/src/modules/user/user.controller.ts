import { Request, Response } from "express";
import { UserService } from "./user.service";

export class UserController {
  constructor(private readonly userService: UserService) {}

  getMe = async (req: Request, res: Response): Promise<void> => {
    const user = await this.userService.getMe(req.user);
    res.status(200).json({ success: true, data: user });
  };

  listUsers = async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const role = req.query.role as "USER" | "INSTRUCTOR" | "ADMIN" | undefined;
    const status = req.query.status as "ACTIVE" | "SUSPENDED" | undefined;
    const users = await this.userService.listUsers(req.user, page, limit, search, role, status);
    res.status(200).json({ success: true, data: users });
  };

  getUserById = async (req: Request, res: Response): Promise<void> => {
    const user = await this.userService.getUserById(req.params.id, req.user);
    res.status(200).json({ success: true, data: user });
  };

  createUser = async (req: Request, res: Response): Promise<void> => {
    const user = await this.userService.createUser(req.body, req.user);
    res.status(201).json({ success: true, data: user });
  };

  updateUser = async (req: Request, res: Response): Promise<void> => {
    const user = await this.userService.updateUser(req.params.id, req.body, req.user);
    res.status(200).json({ success: true, data: user });
  };

  deleteUser = async (req: Request, res: Response): Promise<void> => {
    await this.userService.deleteUser(req.params.id, req.user);
    res.status(204).send();
  };
}
