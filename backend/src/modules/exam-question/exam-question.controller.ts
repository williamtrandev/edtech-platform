import { Request, Response } from "express";
import { ExamQuestionService } from "./exam-question.service";

export class ExamQuestionController {
  constructor(private readonly examQuestionService: ExamQuestionService) {}

  listExamQuestions = async (req: Request, res: Response): Promise<void> => {
    const questions = await this.examQuestionService.listExamQuestions(req.user, req.params.examId);
    res.status(200).json({ success: true, data: questions });
  };

  createExamQuestion = async (req: Request, res: Response): Promise<void> => {
    const question = await this.examQuestionService.createExamQuestion(req.user, req.params.examId, req.body);
    res.status(201).json({ success: true, data: question });
  };

  updateExamQuestion = async (req: Request, res: Response): Promise<void> => {
    const question = await this.examQuestionService.updateExamQuestion(req.user, req.params.questionId, req.body);
    res.status(200).json({ success: true, data: question });
  };

  deleteExamQuestion = async (req: Request, res: Response): Promise<void> => {
    const question = await this.examQuestionService.deleteExamQuestion(req.user, req.params.questionId);
    res.status(200).json({ success: true, data: question });
  };
}
