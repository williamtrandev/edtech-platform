import { Request, Response } from "express";
import { CoursePaymentService } from "./course-payment.service";

export class CoursePaymentController {
  constructor(private readonly coursePaymentService: CoursePaymentService) {}

  getMyPaymentStatus = async (req: Request, res: Response): Promise<void> => {
    const courseId = String(req.query.courseId ?? "");
    const data = await this.coursePaymentService.getMyPaymentStatus(req.user, courseId);
    res.status(200).json({ success: true, data });
  };

  createCoursePayment = async (req: Request, res: Response): Promise<void> => {
    const idempotencyKey = req.header("Idempotency-Key") ?? req.header("idempotency-key") ?? undefined;
    const data = await this.coursePaymentService.createCoursePayment(req.user, req.body.courseId, idempotencyKey);
    res.status(201).json({ success: true, data });
  };
}
