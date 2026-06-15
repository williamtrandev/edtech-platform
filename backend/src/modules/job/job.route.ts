import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { JobController } from "./job.controller";
import {
  listFailedJobsSchema,
  listJobQueuesSchema,
  retryAllFailedJobsSchema,
  retryFailedJobSchema
} from "./job.schema";
import { JobService } from "./job.service";

const jobService = new JobService();
const jobController = new JobController(jobService);

export const jobRouter = Router();

jobRouter.use(authMiddleware);
jobRouter.get("/email-delivery", asyncHandler(jobController.getEmailDelivery));
jobRouter.get("/queues", validateRequest(listJobQueuesSchema), asyncHandler(jobController.listQueues));
jobRouter.get(
  "/queues/:queueName/failed-jobs",
  validateRequest(listFailedJobsSchema),
  asyncHandler(jobController.listFailedJobs)
);
jobRouter.post(
  "/queues/:queueName/failed-jobs/retries",
  validateRequest(retryAllFailedJobsSchema),
  asyncHandler(jobController.retryAllFailedJobs)
);
jobRouter.post(
  "/queues/:queueName/jobs/:jobId/retries",
  validateRequest(retryFailedJobSchema),
  asyncHandler(jobController.retryFailedJob)
);
jobRouter.post(
  "/queues/:queueName/jobs/:jobId/dead-letter",
  validateRequest(retryFailedJobSchema),
  asyncHandler(jobController.moveFailedJobToDeadLetter)
);
jobRouter.delete(
  "/queues/:queueName/jobs/:jobId",
  validateRequest(retryFailedJobSchema),
  asyncHandler(jobController.discardFailedJob)
);
