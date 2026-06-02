import { randomBytes } from "crypto";
import { CertificateStatus } from "@prisma/client";
import { AUDIT_ACTION } from "../../common/constants/analytics";
import { CERTIFICATE_STATUS, NOTIFICATION_TYPE, USER_ROLE } from "../../common/constants/business";
import { CERTIFICATE_PDF_POLL } from "../../common/constants/certificate-pdf";
import { AppError } from "../../common/errors/app-error";
import { enqueueCertificatePdfJob } from "../../jobs/certificate-pdf.jobs";
import { AuditRepository } from "../audit/audit.repository";
import { CourseRepository } from "../course/course.repository";
import { NotificationService } from "../notification/notification.service";
import { createCertificatePdf } from "./certificate-pdf";
import {
  deleteCachedCertificatePdf,
  getCachedCertificatePdf,
  setCachedCertificatePdf
} from "./certificate-pdf-cache";
import { CertificateRepository } from "./certificate.repository";

type ListCourseCertificatesPayload = {
  page: number;
  limit: number;
  status?: CertificateStatus;
};

export class CertificateService {
  constructor(
    private readonly certificateRepository: CertificateRepository,
    private readonly notificationService?: NotificationService,
    private readonly courseRepository?: CourseRepository,
    private readonly auditRepository?: AuditRepository
  ) {}

  async issueCertificateIfMissing(userId: string, courseId: string, courseTitle: string) {
    const existing = await this.certificateRepository.findByUserAndCourse(userId, courseId);
    if (existing) {
      return existing;
    }

    const certificate = await this.certificateRepository.create({
      user: { connect: { id: userId } },
      course: { connect: { id: courseId } },
      verificationCode: this.createVerificationCode()
    });

    await this.notificationService?.createNotification({
      userId,
      type: NOTIFICATION_TYPE.certificateIssued,
      title: "Certificate issued",
      body: `Your certificate for ${courseTitle} is ready.`,
      linkUrl: "/my-progress",
      metadata: {
        certificateId: certificate.id,
        courseId
      }
    });

    await this.auditRepository?.create({
      actor: { connect: { id: userId } },
      action: AUDIT_ACTION.certificateIssued,
      entityType: "Certificate",
      entityId: certificate.id,
      metadata: {
        courseId,
        userId
      }
    });

    void this.enqueuePdfGeneration(certificate.id);

    return certificate;
  }

  async generateAndCachePdf(certificateId: string) {
    const certificate = await this.certificateRepository.findById(certificateId);
    if (!certificate) {
      throw new AppError("Certificate not found", 404, "CERTIFICATE_NOT_FOUND");
    }
    if (certificate.status !== CERTIFICATE_STATUS.active) {
      throw new AppError("Certificate is revoked", 409, "CERTIFICATE_REVOKED");
    }

    const buffer = this.buildPdfBuffer(certificate);
    await setCachedCertificatePdf(certificateId, buffer);
    return buffer;
  }

  async listMyCertificates(user: Express.UserClaims | undefined) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return this.certificateRepository.findByUser(user.id);
  }

  async verifyCertificate(verificationCode: string) {
    const certificate = await this.certificateRepository.findByVerificationCode(verificationCode);
    if (!certificate || certificate.status !== CERTIFICATE_STATUS.active) {
      throw new AppError("Certificate not found", 404, "CERTIFICATE_NOT_FOUND");
    }

    return certificate;
  }

  async listCourseCertificates(user: Express.UserClaims | undefined, courseId: string, payload: ListCourseCertificatesPayload) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const course = await this.courseRepository?.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }
    this.assertCanManageCourse(user, course.instructorId);

    const { items, total } = await this.certificateRepository.findByCourse(courseId, payload.page, payload.limit, payload.status);
    return {
      items,
      pagination: {
        page: payload.page,
        limit: payload.limit,
        total
      }
    };
  }

  async revokeCertificate(user: Express.UserClaims | undefined, certificateId: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const certificate = await this.certificateRepository.findById(certificateId);
    if (!certificate) {
      throw new AppError("Certificate not found", 404, "CERTIFICATE_NOT_FOUND");
    }
    this.assertCanManageCourse(user, certificate.course.instructor.id);

    if (certificate.status === CERTIFICATE_STATUS.revoked) {
      return certificate;
    }

    const revoked = await this.certificateRepository.revoke(certificateId);
    await deleteCachedCertificatePdf(certificateId);
    await this.auditRepository?.create({
      actor: { connect: { id: user.id } },
      action: AUDIT_ACTION.certificateRevoked,
      entityType: "Certificate",
      entityId: certificateId,
      metadata: {
        courseId: certificate.courseId,
        userId: certificate.userId
      }
    });
    return revoked;
  }

  async restoreCertificate(user: Express.UserClaims | undefined, certificateId: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const certificate = await this.certificateRepository.findById(certificateId);
    if (!certificate) {
      throw new AppError("Certificate not found", 404, "CERTIFICATE_NOT_FOUND");
    }
    this.assertCanManageCourse(user, certificate.course.instructor.id);

    if (certificate.status === CERTIFICATE_STATUS.active) {
      return certificate;
    }

    const restored = await this.certificateRepository.restore(certificateId);
    void this.enqueuePdfGeneration(certificateId);
    await this.auditRepository?.create({
      actor: { connect: { id: user.id } },
      action: AUDIT_ACTION.certificateRestored,
      entityType: "Certificate",
      entityId: certificateId,
      metadata: {
        courseId: certificate.courseId,
        userId: certificate.userId
      }
    });
    return restored;
  }

  async createCertificatePdf(user: Express.UserClaims | undefined, certificateId: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const certificate = await this.certificateRepository.findById(certificateId);
    if (!certificate) {
      throw new AppError("Certificate not found", 404, "CERTIFICATE_NOT_FOUND");
    }

    const canDownload =
      user.id === certificate.userId ||
      user.role === USER_ROLE.admin ||
      (user.role === USER_ROLE.instructor && user.id === certificate.course.instructor.id);
    if (!canDownload) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    if (certificate.status !== CERTIFICATE_STATUS.active) {
      throw new AppError("Certificate is revoked", 409, "CERTIFICATE_REVOKED");
    }

    let buffer = await getCachedCertificatePdf(certificateId);
    if (!buffer) {
      await this.enqueuePdfGeneration(certificateId);
      buffer = await this.waitForCachedPdf(certificateId);
    }
    if (!buffer) {
      throw new AppError("Certificate PDF is still generating", 503, "CERTIFICATE_PDF_PROCESSING");
    }

    return {
      filename: this.createPdfFilename(certificate.course.title, certificate.verificationCode),
      buffer
    };
  }

  private assertCanManageCourse(user: Express.UserClaims, instructorId: string) {
    const canManage = user.role === USER_ROLE.admin || (user.role === USER_ROLE.instructor && user.id === instructorId);
    if (!canManage) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
  }

  private createVerificationCode() {
    return `cert_${randomBytes(16).toString("hex")}`;
  }

  private buildPdfBuffer(
    certificate: NonNullable<Awaited<ReturnType<CertificateRepository["findById"]>>>
  ) {
    return createCertificatePdf({
      verificationCode: certificate.verificationCode,
      issuedAt: certificate.issuedAt,
      user: certificate.user,
      course: certificate.course
    });
  }

  private async enqueuePdfGeneration(certificateId: string) {
    try {
      await enqueueCertificatePdfJob(certificateId);
    } catch {
      await this.generateAndCachePdf(certificateId);
    }
  }

  private async waitForCachedPdf(certificateId: string) {
    const deadline = Date.now() + CERTIFICATE_PDF_POLL.maxWaitMs;
    while (Date.now() < deadline) {
      const cached = await getCachedCertificatePdf(certificateId);
      if (cached) {
        return cached;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, CERTIFICATE_PDF_POLL.intervalMs);
      });
    }

    return null;
  }

  private createPdfFilename(courseTitle: string, verificationCode: string) {
    const courseSlug = courseTitle
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 48);
    return `certificate-${courseSlug || "course"}-${verificationCode.slice(-8)}.pdf`;
  }
}
