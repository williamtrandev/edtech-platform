import { Request, Response } from "express";
import { ExamService } from "./exam.service";

export class ExamController {
  constructor(private readonly examService: ExamService) {}

  listCourseExams = async (req: Request, res: Response): Promise<void> => {
    const exams = await this.examService.listCourseExams(req.user, req.params.id, req.query);
    res.status(200).json({ success: true, data: exams });
  };

  createCourseExam = async (req: Request, res: Response): Promise<void> => {
    const exam = await this.examService.createCourseExam(req.user, req.params.id, req.body);
    res.status(201).json({ success: true, data: exam });
  };

  updateExam = async (req: Request, res: Response): Promise<void> => {
    const exam = await this.examService.updateExam(req.user, req.params.examId, req.body);
    res.status(200).json({ success: true, data: exam });
  };

  archiveExam = async (req: Request, res: Response): Promise<void> => {
    const exam = await this.examService.archiveExam(req.user, req.params.examId);
    res.status(200).json({ success: true, data: exam });
  };
}
