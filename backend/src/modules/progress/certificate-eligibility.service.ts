import { CourseRepository } from "../course/course.repository";
import { CertificateService } from "../certificate/certificate.service";
import { CourseProgressService } from "./course-progress.service";

export class CertificateEligibilityService {
  constructor(
    private readonly courseProgressService: CourseProgressService,
    private readonly certificateService: CertificateService,
    private readonly courseRepository: CourseRepository
  ) {}

  async tryIssueCertificateIfEligible(userId: string, courseId: string) {
    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      return null;
    }

    const snapshot = await this.courseProgressService.getSnapshot(userId, courseId);
    if (!snapshot.isComplete) {
      return null;
    }

    return this.certificateService.issueCertificateIfMissing(userId, courseId, course.title);
  }
}
