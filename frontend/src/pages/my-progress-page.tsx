import { Link } from "react-router-dom";
import { useState } from "react";
import { Award, BookOpenCheck, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "../components/app-shell";
import { CourseProgressBar } from "../components/course-progress-bar";
import { EmptyState } from "../components/empty-state";
import { LearnerAnalyticsOverview } from "../components/learner-analytics-overview";
import { EnrollmentListSkeleton } from "../components/skeleton";
import { CERTIFICATE_STATUS } from "../constants/business";
import { useMyCertificates } from "../hooks/use-certificates";
import { useMyEnrollments } from "../hooks/use-enrollments";
import { useI18n } from "../i18n";
import { downloadBlob } from "../lib/download-file";
import { getCourseLearnPath } from "../lib/course-learn-path";
import { STUDIO_FORM_SHELL, STUDIO_ROW } from "../lib/studio-ui";
import { cn } from "@/lib/utils";
import { certificateService } from "../services/certificate.service";

export function MyProgressPage() {
  const { data, isLoading, isError } = useMyEnrollments();
  const certificatesQuery = useMyCertificates();
  const certificates = certificatesQuery.data ?? [];
  const { t, formatError } = useI18n();
  const [downloadingCertificateId, setDownloadingCertificateId] = useState<string | null>(null);

  const handleDownloadCertificate = async (certificateId: string) => {
    setDownloadingCertificateId(certificateId);
    try {
      const file = await certificateService.downloadCertificatePdf(certificateId);
      downloadBlob(file.blob, file.filename);
    } catch (error) {
      toast.error(formatError(error, "progress.certificateDownloadFailed"));
    } finally {
      setDownloadingCertificateId(null);
    }
  };

  return (
    <AppShell title={t("progress.title")} subtitle={t("progress.subtitle")}>
      <div className="space-y-8">
        <LearnerAnalyticsOverview />

        <section className={cn(STUDIO_FORM_SHELL, "space-y-5")}>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">{t("progress.certificates")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("progress.certificatesDescription")}</p>
          </div>
          <div className="flex justify-end">
            <Button asChild variant="outline" size="sm" className="h-9 rounded-md shadow-none">
              <Link to="/my-certificates">{t("progress.openCertificatesPage")}</Link>
            </Button>
          </div>
          {certificatesQuery.isLoading ? <EnrollmentListSkeleton rows={2} /> : null}
          {certificatesQuery.isError ? (
            <div className="rounded-xl bg-destructive/5 px-4 py-3 text-sm text-destructive ring-1 ring-destructive/20">
              {t("progress.certificatesLoadFailed")}
            </div>
          ) : null}
          {!certificatesQuery.isLoading && !certificatesQuery.isError ? (
            certificates.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {certificates.map((certificate) => (
                  <article key={certificate.id} className={cn(STUDIO_ROW, "space-y-4")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{certificate.course.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("progress.issued")} {new Date(certificate.issuedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary" className="rounded-md">
                        {certificate.status}
                      </Badge>
                    </div>
                    <p className="break-all font-mono text-[11px] text-muted-foreground">{certificate.verificationCode}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 rounded-md shadow-none"
                        disabled={certificate.status !== CERTIFICATE_STATUS.active || downloadingCertificateId === certificate.id}
                        onClick={() => {
                          void handleDownloadCertificate(certificate.id);
                        }}
                      >
                        <Download className="size-4" aria-hidden />
                        {downloadingCertificateId === certificate.id ? t("progress.downloadingCertificate") : t("progress.downloadCertificate")}
                      </Button>
                      <Button asChild size="sm" className="h-9 rounded-md shadow-none">
                        <Link to={getCourseLearnPath(certificate.courseId)}>{t("progress.course")}</Link>
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState icon={Award} title={t("progress.noCertificates")} description={t("progress.noCertificatesDescription")} />
            )
          ) : null}
        </section>

        <section className={cn(STUDIO_FORM_SHELL, "space-y-5")}>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">{t("progress.yourCourses")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("progress.yourCoursesDescription")}</p>
          </div>
          {isLoading ? <EnrollmentListSkeleton rows={4} /> : null}
          {isError ? (
            <div className="rounded-xl bg-destructive/5 px-4 py-3 text-sm text-destructive ring-1 ring-destructive/20">
              {t("progress.enrollmentsLoadFailed")}
            </div>
          ) : null}
          {!isLoading && !isError ? (
            data?.length ? (
              <ul className="space-y-3">
                {data.map((enrollment) => (
                  <li key={enrollment.id} className={cn(STUDIO_ROW, "space-y-4")}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="space-y-2">
                          <p className="truncate text-base font-semibold tracking-tight text-foreground">
                            {enrollment.course?.title ?? enrollment.courseId}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="rounded-md font-medium">
                              {enrollment.course?.status ?? "UNKNOWN"}
                            </Badge>
                            <span>
                              {t("progress.enrolled")} {new Date(enrollment.enrolledAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {enrollment.progress ? (
                          <CourseProgressBar
                            percentage={enrollment.progress.percentage}
                            completedLessons={enrollment.progress.completedLessons}
                            totalLessons={enrollment.progress.totalLessons}
                            passedExams={enrollment.progress.passedExams}
                            totalExams={enrollment.progress.totalExams}
                            submittedAssignments={enrollment.progress.submittedAssignments}
                            totalAssignments={enrollment.progress.totalAssignments}
                          />
                        ) : null}
                      </div>
                      <Button asChild size="sm" className="shrink-0 rounded-lg shadow-sm">
                        <Link to={getCourseLearnPath(enrollment.courseId)}>{t("progress.continue")}</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={BookOpenCheck}
                title={t("progress.noEnrollments")}
                description={t("progress.noEnrollmentsDescription")}
                action={
                  <Button asChild className="rounded-lg" size="sm">
                    <Link to="/explore">{t("progress.exploreCatalog")}</Link>
                  </Button>
                }
              />
            )
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
