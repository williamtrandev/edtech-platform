import { createQueue, createWorker } from "./base.queue";
import { CertificateRepository } from "../modules/certificate/certificate.repository";
import { CertificateService } from "../modules/certificate/certificate.service";
import { CourseRepository } from "../modules/course/course.repository";
import { ExamAttemptRepository } from "../modules/exam-attempt/exam-attempt.repository";
import { ExamGradingService } from "../modules/exam-attempt/exam-grading.service";
import { CertificateEligibilityService } from "../modules/progress/certificate-eligibility.service";
import { CourseProgressRepository } from "../modules/progress/course-progress.repository";
import { CourseProgressService } from "../modules/progress/course-progress.service";
import { ProgressRepository } from "../modules/progress/progress.repository";
import { NotificationRepository } from "../modules/notification/notification.repository";
import { NotificationService } from "../modules/notification/notification.service";
import { AuditRepository } from "../modules/audit/audit.repository";

const queueName = "exam-grading";

export type ExamGradingJobPayload = {
  attemptId: string;
};

export const examGradingQueue = createQueue(queueName);

const examAttemptRepository = new ExamAttemptRepository();
const auditRepository = new AuditRepository();
const notificationRepository = new NotificationRepository();
const notificationService = new NotificationService(notificationRepository);
const courseRepository = new CourseRepository();
const progressRepository = new ProgressRepository();
const courseProgressRepository = new CourseProgressRepository();
const certificateRepository = new CertificateRepository();
const courseProgressService = new CourseProgressService(progressRepository, courseProgressRepository);
const certificateService = new CertificateService(certificateRepository, notificationService, courseRepository);
const certificateEligibilityService = new CertificateEligibilityService(
  courseProgressService,
  certificateService,
  courseRepository
);
const examGradingService = new ExamGradingService(
  examAttemptRepository,
  notificationService,
  certificateEligibilityService,
  auditRepository
);

export const examGradingWorker = createWorker(queueName, async (job) => {
  const payload = job.data as ExamGradingJobPayload;
  if (!payload.attemptId) {
    throw new Error("EXAM_GRADING_MISSING_ATTEMPT_ID");
  }

  await examGradingService.gradeAttempt(payload.attemptId);
});
