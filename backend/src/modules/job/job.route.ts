import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { JobController } from "./job.controller";
import { listJobQueuesSchema } from "./job.schema";
import { JobService } from "./job.service";

const jobService = new JobService();
const jobController = new JobController(jobService);

export const jobRouter = Router();

jobRouter.use(authMiddleware);
jobRouter.get("/queues", validateRequest(listJobQueuesSchema), asyncHandler(jobController.listQueues));
