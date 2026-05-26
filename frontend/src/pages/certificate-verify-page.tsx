import { Award, CheckCircle2, XCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useVerifyCertificate } from "../hooks/use-certificates";
import { useI18n } from "../i18n";

export function CertificateVerifyPage() {
  const { verificationCode } = useParams();
  const certificateQuery = useVerifyCertificate(verificationCode);
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto grid w-full max-w-2xl gap-6">
        <Link to="/" className="inline-flex w-fit items-center gap-2 text-sm font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-xs font-bold text-background">E</span>
          EdTech
        </Link>

        <Card className="rounded-lg border-border/70 shadow-none">
          <CardHeader className="pb-4">
            <div className="mb-3 flex size-11 items-center justify-center rounded-md bg-muted">
              <Award className="size-5 text-muted-foreground" aria-hidden />
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight">{t("certificateVerify.title")}</CardTitle>
            <CardDescription>{t("certificateVerify.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            {certificateQuery.isLoading ? (
              <div className="grid gap-3">
                <div className="h-16 animate-pulse rounded-md bg-muted" />
                <div className="h-16 animate-pulse rounded-md bg-muted" />
              </div>
            ) : null}

            {certificateQuery.isError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="mt-0.5 size-5 text-destructive" aria-hidden />
                  <div>
                    <h1 className="text-base font-semibold text-destructive">{t("certificateVerify.notFound")}</h1>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("certificateVerify.notFoundDescription")}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {certificateQuery.data ? (
              <div className="grid gap-4">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    <div>
                      <h1 className="text-base font-semibold">{t("certificateVerify.valid")}</h1>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("certificateVerify.validDescription")}</p>
                    </div>
                  </div>
                </div>
                <dl className="grid gap-3 rounded-lg border border-border/70 p-4 text-sm">
                  <div className="grid gap-1 sm:grid-cols-[9rem_1fr]">
                    <dt className="text-muted-foreground">{t("certificateVerify.course")}</dt>
                    <dd className="font-medium">{certificateQuery.data.course.title}</dd>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-[9rem_1fr]">
                    <dt className="text-muted-foreground">{t("certificateVerify.learner")}</dt>
                    <dd className="font-medium">{certificateQuery.data.user.email}</dd>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-[9rem_1fr]">
                    <dt className="text-muted-foreground">{t("certificateVerify.issued")}</dt>
                    <dd className="font-medium">{new Date(certificateQuery.data.issuedAt).toLocaleDateString()}</dd>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-[9rem_1fr]">
                    <dt className="text-muted-foreground">{t("certificateVerify.code")}</dt>
                    <dd className="break-all font-mono text-xs">{certificateQuery.data.verificationCode}</dd>
                  </div>
                </dl>
                <Button asChild className="h-10 w-fit rounded-md shadow-none">
                  <Link to={`/courses/${certificateQuery.data.courseId}`}>{t("certificateVerify.viewCourse")}</Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
