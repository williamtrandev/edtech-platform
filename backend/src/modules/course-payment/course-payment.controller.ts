import { Request, Response } from "express";
import { PaymentProvider } from "@prisma/client";
import { env } from "../../config/env";
import { AppError } from "../../common/errors/app-error";
import { CoursePaymentService } from "./course-payment.service";

export class CoursePaymentController {
  constructor(private readonly coursePaymentService: CoursePaymentService) {}

  private apiBaseUrl(req: Request): string {
    return `${req.protocol}://${req.get("host")}`;
  }

  getMyPaymentStatus = async (req: Request, res: Response): Promise<void> => {
    const courseId = String(req.query.courseId ?? "");
    const data = await this.coursePaymentService.getMyPaymentStatus(req.user, courseId);
    res.status(200).json({ success: true, data });
  };

  listProviders = async (req: Request, res: Response): Promise<void> => {
    const courseId = String(req.query.courseId ?? "");
    const data = await this.coursePaymentService.listProviders(req.user, courseId);
    res.status(200).json({ success: true, data });
  };

  listMyPayments = async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const data = await this.coursePaymentService.listMyPayments(req.user, page, limit);
    res.status(200).json({ success: true, data });
  };

  createCoursePayment = async (req: Request, res: Response): Promise<void> => {
    const idempotencyKey = req.header("Idempotency-Key") ?? req.header("idempotency-key") ?? undefined;
    const data = await this.coursePaymentService.createCoursePayment(
      req.user,
      req.body.courseId,
      req.body.provider as PaymentProvider,
      idempotencyKey,
      { apiBaseUrl: this.apiBaseUrl(req), clientIp: req.ip ?? "127.0.0.1" }
    );
    res.status(201).json({ success: true, data });
  };

  // --- Public gateway callbacks (no auth) ---

  stripeWebhook = async (req: Request, res: Response): Promise<void> => {
    const signature = req.header("stripe-signature");
    if (!signature) {
      throw new AppError("Missing stripe-signature header", 400, "STRIPE_SIGNATURE_MISSING");
    }
    const rawBody = req.rawBody ?? req.body;
    const data = await this.coursePaymentService.handleStripeWebhook(rawBody, signature);
    res.status(200).json(data);
  };

  stripeReturn = async (req: Request, res: Response): Promise<void> => {
    const sessionId = String(req.query.session_id ?? "");
    if (!sessionId) {
      res.redirect(`${env.APP_PUBLIC_URL}/courses?payment=failed`);
      return;
    }
    const result = await this.coursePaymentService.handleStripeReturn(sessionId);
    const status = result.success ? "success" : "failed";
    res.redirect(`${env.APP_PUBLIC_URL}/courses/${result.courseId}?payment=${status}`);
  };

  vnpayReturn = async (req: Request, res: Response): Promise<void> => {
    const result = await this.coursePaymentService.handleVnpayReturn(req.query as Record<string, unknown>);
    const status = result.success ? "success" : "failed";
    res.redirect(`${env.APP_PUBLIC_URL}/courses/${result.courseId}?payment=${status}`);
  };

  vnpayIpn = async (req: Request, res: Response): Promise<void> => {
    const data = await this.coursePaymentService.handleVnpayIpn(req.query as Record<string, unknown>);
    res.status(200).json(data);
  };

  mockReturn = async (req: Request, res: Response): Promise<void> => {
    const paymentId = String(req.query.paymentId ?? "");
    const result = await this.coursePaymentService.handleMockReturn(paymentId);
    const status = result.success ? "success" : "failed";
    res.redirect(`${env.APP_PUBLIC_URL}/courses/${result.courseId}?payment=${status}`);
  };
}
