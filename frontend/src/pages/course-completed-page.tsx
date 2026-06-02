import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Award, CheckCircle2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "../components/app-shell";
import { useCourseDetail } from "../hooks/use-courses";
import { useMyCertificates } from "../hooks/use-certificates";
import { useI18n } from "../i18n";
import { downloadBlob } from "../lib/download-file";
import { certificateService } from "../services/certificate.service";

type CompletionLocationState = {
  certificateId?: string | null;
  verificationCode?: string | null;
};

export function CourseCompletedPage() {
  const { courseId = "" } = useParams();
  const location = useLocation();
  const state = (location.state as CompletionLocationState | null) ?? null;
  const { t, formatError } = useI18n();
  const courseQuery = useCourseDetail(courseId);
  const certificatesQuery = useMyCertificates();
  const [downloadingCertificateId, setDownloadingCertificateId] = useState<string | null>(null);

  if (!courseId) {
    return <Navigate to="/dashboard" replace />;
  }

  const certificate =
    certificatesQuery.data?.find((item) => item.courseId === courseId) ??
    (state?.certificateId && state?.verificationCode
      ? {
          id: state.certificateId,
          verificationCode: state.verificationCode
        }
      : null);

  useEffect(() => {
    if (certificate || !courseId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void certificatesQuery.refetch();
    }, 2500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [certificate, certificatesQuery, courseId]);

  const handleDownloadCertificate = async () => {
    if (!certificate?.id) {
      return;
    }

    setDownloadingCertificateId(certificate.id);
    try {
      const file = await certificateService.downloadCertificatePdf(certificate.id);
      downloadBlob(file.blob, file.filename);
    } catch (error) {
      toast.error(formatError(error, "progress.certificateDownloadFailed"));
    } finally {
      setDownloadingCertificateId(null);
    }
  };

  return (
    <AppShell
      title={t("courseCompleted.title")}
      subtitle={courseQuery.data ? t("courseCompleted.subtitle").replace("{course}", courseQuery.data.title) : t("courseCompleted.subtitleFallback")}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <Card className="rounded-xl border-border/70 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CheckCircle2 className="size-5 text-primary" aria-hidden />
              {t("courseCompleted.congratsTitle")}
            </CardTitle>
            <CardDescription>{t("courseCompleted.congratsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/dashboard">{t("courseCompleted.backToLearning")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/courses/${courseId}/learn`}>{t("courseCompleted.reviewCourse")}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/70 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="size-5" aria-hidden />
              {t("courseCompleted.certificateTitle")}
            </CardTitle>
            <CardDescription>{t("courseCompleted.certificateDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {certificate ? (
              <>
                <Button asChild>
                  <Link to={`/certificates/verify/${certificate.verificationCode}`}>{t("courseCompleted.verifyCertificate")}</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={downloadingCertificateId === certificate.id}
                  onClick={() => {
                    void handleDownloadCertificate();
                  }}
                >
                  {downloadingCertificateId === certificate.id ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                      {t("progress.downloadingCertificate")}
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 size-4" aria-hidden />
                      {t("courseCompleted.downloadCertificate")}
                    </>
                  )}
                </Button>
                <Button asChild variant="outline">
                  <Link to="/my-progress">{t("courseCompleted.openProgress")}</Link>
                </Button>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t("courseCompleted.generatingCertificate")}
                </div>
                <Button asChild>
                  <Link to="/my-progress">{t("courseCompleted.openProgress")}</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
