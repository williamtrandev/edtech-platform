import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "../components/auth-shell";
import { useAuth } from "../features/auth/auth-context";
import { useI18n } from "../i18n";

export function EmailConfirmedPage() {
  const { session, signOut } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    if (session?.access_token) {
      void signOut();
    }
  }, [session?.access_token, signOut]);

  return (
    <AuthShell
      eyebrow={t("auth.eyebrow.emailConfirmed")}
      title={t("auth.signup.confirmedTitle")}
      description={t("auth.signup.confirmedBody")}
      footer={<span>{t("auth.signup.confirmedFooter")}</span>}
    >
      <div role="status" className="rounded-xl border border-border/70 bg-muted/35 p-4 text-sm text-foreground">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
            <CheckCircle2 className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-semibold">{t("auth.signup.confirmedTitle")}</p>
            <p className="mt-1 leading-6 text-muted-foreground">{t("auth.signup.confirmedBody")}</p>
          </div>
        </div>
      </div>

      <Button asChild className="mt-5 h-12 w-full rounded-xl text-base font-semibold shadow-sm">
        <Link to="/login">{t("auth.footer.signIn")}</Link>
      </Button>
    </AuthShell>
  );
}
