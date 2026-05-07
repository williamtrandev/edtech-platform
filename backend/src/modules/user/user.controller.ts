import { Request, Response } from "express";
import { UserService } from "./user.service";

export class UserController {
  constructor(private readonly userService: UserService) {}

  listUsers = async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const users = await this.userService.listUsers(page, limit);
    res.status(200).json({ success: true, data: users });
  };

  getUserById = async (req: Request, res: Response): Promise<void> => {
    const user = await this.userService.getUserById(req.params.id);
    res.status(200).json({ success: true, data: user });
  };

  createUser = async (req: Request, res: Response): Promise<void> => {
    const user = await this.userService.createUser(req.body);
    res.status(201).json({ success: true, data: user });
  };

  updateUser = async (req: Request, res: Response): Promise<void> => {
    const user = await this.userService.updateUser(req.params.id, req.body);
    res.status(200).json({ success: true, data: user });
  };

  deleteUser = async (req: Request, res: Response): Promise<void> => {
    await this.userService.deleteUser(req.params.id);
    res.status(204).send();
  };
}
