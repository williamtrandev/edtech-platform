import { Request, Response } from "express";
import { ExamAttemptService } from "./exam-attempt.service";

export class ExamAttemptController {
  constructor(private readonly examAttemptService: ExamAttemptService) {}

  startAttempt = async (req: Request, res: Response): Promise<void> => {
    const attempt = await this.examAttemptService.startAttempt(req.user, req.params.examId);
    res.status(201).json({ success: true, data: attempt });
  };

  getAttempt = async (req: Request, res: Response): Promise<void> => {
    const attempt = await this.examAttemptService.getAttempt(req.user, req.params.attemptId);
    res.status(200).json({ success: true, data: attempt });
  };

  submitAttempt = async (req: Request, res: Response): Promise<void> => {
    const submission = await this.examAttemptService.submitAttempt(req.user, req.params.attemptId, req.body, req.header("Idempotency-Key"));
    res.status(200).json({ success: true, data: submission });
  };

  saveAttemptAnswers = async (req: Request, res: Response): Promise<void> => {
    const saved = await this.examAttemptService.saveAttemptAnswers(req.user, req.params.attemptId, req.body);
    res.status(200).json({ success: true, data: saved });
  };

  gradeAttempt = async (req: Request, res: Response): Promise<void> => {
    const graded = await this.examAttemptService.gradeAttemptManually(req.user, req.params.attemptId, req.body);
    res.status(200).json({ success: true, data: graded });
  };
}
