import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { Award, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "../components/app-shell";
import { useCourseDetail } from "../hooks/use-courses";
import { useMyCertificates } from "../hooks/use-certificates";
import { useI18n } from "../i18n";

type CompletionLocationState = {
  certificateId?: string | null;
  verificationCode?: string | null;
};

export function CourseCompletedPage() {
  const { courseId = "" } = useParams();
  const location = useLocation();
  const state = (location.state as CompletionLocationState | null) ?? null;
  const { t } = useI18n();
  const courseQuery = useCourseDetail(courseId);
  const certificatesQuery = useMyCertificates();

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
                <Button asChild variant="outline">
                  <Link to="/my-progress">{t("courseCompleted.openProgress")}</Link>
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link to="/my-progress">{t("courseCompleted.openProgress")}</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
