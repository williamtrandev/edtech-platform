import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { UploadController } from "./upload.controller";
import { uploadFileSchema } from "./upload.schema";
import { UploadService } from "./upload.service";

const uploadService = new UploadService();
const uploadController = new UploadController(uploadService);

export const uploadRouter = Router();

uploadRouter.use(authMiddleware);
uploadRouter.post("/", validateRequest(uploadFileSchema), asyncHandler(uploadController.uploadFile));
