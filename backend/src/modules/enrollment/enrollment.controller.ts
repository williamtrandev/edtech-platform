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

  dropMyEnrollment = async (req: Request, res: Response): Promise<void> => {
    const enrollment = await this.enrollmentService.dropMyEnrollment(req.user, req.params.enrollmentId);
    res.status(200).json({ success: true, data: enrollment });
  };

  enrollUserByManager = async (req: Request, res: Response): Promise<void> => {
    const enrollment = await this.enrollmentService.enrollUserByManager(req.user, req.params.id, req.body.email);
    res.status(201).json({ success: true, data: enrollment });
  };

  removeUserEnrollmentByManager = async (req: Request, res: Response): Promise<void> => {
    const enrollment = await this.enrollmentService.removeUserEnrollmentByManager(req.user, req.params.id, req.params.userId);
    res.status(200).json({ success: true, data: enrollment });
  };
}
