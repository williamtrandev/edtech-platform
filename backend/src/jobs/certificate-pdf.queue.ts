import { CertificateRepository } from "../modules/certificate/certificate.repository";
import { CertificateService } from "../modules/certificate/certificate.service";
import { CourseRepository } from "../modules/course/course.repository";
import { NotificationRepository } from "../modules/notification/notification.repository";
import { NotificationService } from "../modules/notification/notification.service";
import type { CertificatePdfJobPayload } from "./certificate-pdf.jobs";
import { createWorker } from "./base.queue";

const queueName = "certificate-pdf";

const certificateRepository = new CertificateRepository();
const notificationRepository = new NotificationRepository();
const notificationService = new NotificationService(notificationRepository);
const courseRepository = new CourseRepository();
const certificateService = new CertificateService(certificateRepository, notificationService, courseRepository);

export const certificatePdfWorker = createWorker(
  queueName,
  async (job) => {
    const payload = job.data as CertificatePdfJobPayload;
    if (!payload.certificateId) {
      throw new Error("CERTIFICATE_PDF_MISSING_CERTIFICATE_ID");
    }

    await certificateService.generateAndCachePdf(payload.certificateId);
  },
  {
    concurrency: 3
  }
);
