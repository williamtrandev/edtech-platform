import type { Request, Response } from "express";
import { JobService } from "./job.service";

export class JobController {
  constructor(private readonly jobService: JobService) {}

  listQueues = async (req: Request, res: Response): Promise<void> => {
    const includeSamples = req.query.includeSamples !== "false";
    const queues = await this.jobService.listQueues(req.user, includeSamples);
    res.status(200).json({ success: true, data: queues });
  };

  listFailedJobs = async (req: Request, res: Response): Promise<void> => {
    const data = await this.jobService.listFailedJobs(
      req.user,
      req.params.queueName,
      Number(req.query.page ?? 1),
      Number(req.query.limit ?? 20)
    );
    res.status(200).json({ success: true, data });
  };

  retryFailedJob = async (req: Request, res: Response): Promise<void> => {
    const queueName = req.params.queueName;
    const jobId = req.params.jobId;
    const job = await this.jobService.retryFailedJob(req.user, queueName, jobId);
    res.status(201).json({ success: true, data: job });
  };

  retryAllFailedJobs = async (req: Request, res: Response): Promise<void> => {
    const data = await this.jobService.retryAllFailedJobs(req.user, req.params.queueName, req.body.limit);
    res.status(201).json({ success: true, data });
  };

  discardFailedJob = async (req: Request, res: Response): Promise<void> => {
    const data = await this.jobService.discardFailedJob(req.user, req.params.queueName, req.params.jobId);
    res.status(200).json({ success: true, data });
  };

  moveFailedJobToDeadLetter = async (req: Request, res: Response): Promise<void> => {
    const data = await this.jobService.moveFailedJobToDeadLetter(req.user, req.params.queueName, req.params.jobId);
    res.status(201).json({ success: true, data });
  };
}
