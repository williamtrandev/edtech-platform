import { Request, Response } from "express";
import { UploadService } from "./upload.service";

export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  uploadFile = async (req: Request, res: Response): Promise<void> => {
    const file = await this.uploadService.saveFile(req.body);
    res.status(201).json({ success: true, data: file });
  };
}
