import { Request, Response } from "express";
import { CertificateStatus } from "@prisma/client";
import { CertificateService } from "./certificate.service";

export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  listMyCertificates = async (req: Request, res: Response): Promise<void> => {
    const certificates = await this.certificateService.listMyCertificates(req.user);
    res.status(200).json({ success: true, data: certificates });
  };

  verifyCertificate = async (req: Request, res: Response): Promise<void> => {
    const certificate = await this.certificateService.verifyCertificate(req.params.verificationCode);
    res.status(200).json({ success: true, data: certificate });
  };

  listCourseCertificates = async (req: Request, res: Response): Promise<void> => {
    const certificates = await this.certificateService.listCourseCertificates(req.user, req.params.id, {
      page: Number(req.query.page ?? 1),
      limit: Number(req.query.limit ?? 20),
      status: req.query.status ? (String(req.query.status) as CertificateStatus) : undefined
    });
    res.status(200).json({ success: true, data: certificates });
  };

  revokeCertificate = async (req: Request, res: Response): Promise<void> => {
    const certificate = await this.certificateService.revokeCertificate(req.user, req.params.certificateId);
    res.status(200).json({ success: true, data: certificate });
  };

  restoreCertificate = async (req: Request, res: Response): Promise<void> => {
    const certificate = await this.certificateService.restoreCertificate(req.user, req.params.certificateId);
    res.status(200).json({ success: true, data: certificate });
  };
}
