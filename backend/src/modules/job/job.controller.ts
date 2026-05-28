import type { Request, Response } from "express";
import { JobService } from "./job.service";

export class JobController {
  constructor(private readonly jobService: JobService) {}

  listQueues = async (req: Request, res: Response): Promise<void> => {
    const includeSamples = req.query.includeSamples !== "false";
    const queues = await this.jobService.listQueues(req.user, includeSamples);
    res.status(200).json({ success: true, data: queues });
  };

  retryFailedJob = async (req: Request, res: Response): Promise<void> => {
    const queueName = req.params.queueName;
    const jobId = req.params.jobId;
    const job = await this.jobService.retryFailedJob(req.user, queueName, jobId);
    res.status(201).json({ success: true, data: job });
  };
}
