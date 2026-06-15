import { Request, Response } from "express";
import { CertificateStatus } from "@prisma/client";
import { CertificateService } from "./certificate.service";

export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  listMyCertificates = async (req: Request, res: Response): Promise<void> => {
    const certificates = await this.certificateService.listMyCertificates(req.user);
    res.status(200).json({ success: true, data: certificates });
  };

  getSearchSuggestions = async (req: Request, res: Response): Promise<void> => {
    const suggestions = await this.certificateService.getSearchSuggestions(
      req.user,
      String(req.query.q ?? ""),
      Number(req.query.limit ?? 8)
    );
    res.status(200).json({ success: true, data: suggestions });
  };

  trackSearchTerm = async (req: Request, res: Response): Promise<void> => {
    await this.certificateService.trackSearchTerm(req.user, String(req.body.term ?? ""));
    res.status(204).send();
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

  downloadCertificatePdf = async (req: Request, res: Response): Promise<void> => {
    const pdf = await this.certificateService.createCertificatePdf(req.user, req.params.certificateId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${pdf.filename}"`);
    res.setHeader("Content-Length", pdf.buffer.length);
    res.status(200).send(pdf.buffer);
  };
}
