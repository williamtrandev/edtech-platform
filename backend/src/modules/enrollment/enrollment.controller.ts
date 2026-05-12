import { Request, Response } from "express";
import { EnrollmentService } from "./enrollment.service";

export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  createEnrollment = async (req: Request, res: Response): Promise<void> => {
    const enrollment = await this.enrollmentService.createEnrollment(req.user, req.body);
    res.status(201).json({ success: true, data: enrollment });
  };

  listMyEnrollments = async (req: Request, res: Response): Promise<void> => {
    const enrollments = await this.enrollmentService.listMyEnrollments(req.user);
    res.status(200).json({ success: true, data: enrollments });
  };
}
