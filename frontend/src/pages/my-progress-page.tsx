import { Link } from "react-router-dom";
import { useState } from "react";
import { Award, BookOpenCheck, CheckCircle2, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "../components/app-shell";
import { EmptyState } from "../components/empty-state";
import { MetricCard } from "../components/metric-card";
import { EnrollmentListSkeleton, MetricCardSkeleton } from "../components/skeleton";
import { CERTIFICATE_STATUS } from "../constants/business";
import { useMyCertificates } from "../hooks/use-certificates";
import { useMyEnrollments } from "../hooks/use-enrollments";
import { useI18n } from "../i18n";
import { downloadBlob } from "../lib/download-file";
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
    <AppShell
      title={t("progress.title")}
      subtitle={t("progress.subtitle")}
    >
      <div className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-3">
          {isLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <MetricCard icon={BookOpenCheck} label={t("progress.enrollments")} value={data?.length ?? 0} hint={t("progress.enrollmentsHint")} />
              <MetricCard icon={CheckCircle2} label={t("progress.sync")} value={isError ? t("progress.issue") : t("progress.healthy")} hint={t("progress.syncHint")} />
              <MetricCard icon={Award} label={t("progress.certificates")} value={certificates.length} hint={t("progress.certificatesHint")} />
            </>
          )}
        </section>

        <Card className="rounded-lg border-border/70 bg-card shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">{t("progress.certificates")}</CardTitle>
            <CardDescription className="text-sm">{t("progress.certificatesDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {certificatesQuery.isLoading ? <EnrollmentListSkeleton rows={2} /> : null}
            {certificatesQuery.isError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {t("progress.certificatesLoadFailed")}
              </div>
            ) : null}
            {!certificatesQuery.isLoading && !certificatesQuery.isError ? (
              certificates.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {certificates.map((certificate) => (
                    <article key={certificate.id} className="rounded-lg border border-border/70 bg-background p-4">
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
                      <p className="mt-3 break-all font-mono text-[11px] text-muted-foreground">{certificate.verificationCode}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline" className="h-9 rounded-md shadow-none">
                          <Link to={`/certificates/verify/${certificate.verificationCode}`}>{t("progress.verify")}</Link>
                        </Button>
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
                          <Link to={`/courses/${certificate.courseId}`}>{t("progress.course")}</Link>
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Award} title={t("progress.noCertificates")} description={t("progress.noCertificatesDescription")} />
              )
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-border/70 bg-card shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">{t("progress.yourCourses")}</CardTitle>
            <CardDescription className="text-sm">{t("progress.yourCoursesDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <EnrollmentListSkeleton rows={4} /> : null}
            {isError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {t("progress.enrollmentsLoadFailed")}
              </div>
            ) : null}
            {!isLoading && !isError ? (
              data?.length ? (
                <ul className="space-y-3">
                  {data.map((enrollment) => (
                    <li
                      key={enrollment.id}
                      className="rounded-lg border border-border/70 bg-background p-4 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-2">
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
                        <Button asChild size="sm" className="shrink-0 rounded-lg shadow-sm">
                          <Link to={`/courses/${enrollment.courseId}`}>{t("progress.continue")}</Link>
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
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
