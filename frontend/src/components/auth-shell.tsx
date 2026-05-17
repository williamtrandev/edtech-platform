import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AUTH_LAYOUT } from "../constants/auth-ui";
import { LanguageSelect, ThemeSelect } from "../features/preferences/preference-selectors";
import { useI18n } from "../i18n";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthShell({ eyebrow, title, description, children, footer }: AuthShellProps) {
  const { t } = useI18n();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <Link
            to="/login"
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-2 text-sm font-semibold tracking-tight transition-colors hover:bg-muted/70"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
              E
            </span>
            {t("app.name")}
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <ThemeSelect variant="icon" className="border-border/70 bg-background shadow-none" />
            <LanguageSelect variant="icon" className="border-border/70 bg-background shadow-none" />
          </div>
        </header>

        <main className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1fr_0.92fr] lg:gap-12 lg:py-10">
          <section className="hidden lg:block">
            <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-none">
              <img
                src={AUTH_LAYOUT.heroImagePath}
                alt={AUTH_LAYOUT.heroImageAlt}
                className="h-[34rem] w-full rounded-xl object-cover"
                decoding="async"
                fetchPriority="high"
              />
              <div className="absolute inset-4 rounded-xl bg-gradient-to-t from-background via-background/75 to-background/10" aria-hidden />
              <div className="absolute inset-x-9 bottom-9">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/85 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  {eyebrow}
                  <ArrowRight className="size-3.5 text-foreground" aria-hidden />
                </div>
                <h2 className="max-w-lg text-3xl font-semibold tracking-tight text-foreground">
                  {t("auth.heroTitle")}
                </h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
                <div className="mt-6 grid max-w-md gap-3 text-sm">
                  <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/80 px-4 py-3">
                    <CheckCircle2 className="size-4 text-foreground" aria-hidden />
                    <span className="text-muted-foreground">{t("auth.heroPointProgress")}</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/80 px-4 py-3">
                    <ShieldCheck className="size-4 text-foreground" aria-hidden />
                    <span className="text-muted-foreground">{t("auth.heroPointSecurity")}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="flex justify-center lg:justify-end">
            <Card className="w-full max-w-[29rem] rounded-2xl border-border/70 bg-card py-0 shadow-none ring-1 ring-border/40">
              <CardContent className="p-6 sm:p-8">
                <div className="mb-7">
                  <p className="inline-flex rounded-full border border-border/70 bg-muted/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {eyebrow}
                  </p>
                  <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground lg:hidden">{description}</p>
                </div>
                {children}
                <div className="mt-8 border-t border-border/60 pt-6 text-center text-sm text-muted-foreground">{footer}</div>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
