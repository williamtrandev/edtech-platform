import { ArrowLeft, Compass, SearchX } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppShell } from "../components/app-shell";
import { useI18n } from "../i18n";

export function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <AppShell title={t("notFound.title")} subtitle={t("notFound.subtitle")}>
      <Card className="mx-auto max-w-3xl">
        <CardContent className="grid gap-6 p-6 text-center sm:p-10">
          <div className="mx-auto flex size-14 items-center justify-center rounded-md bg-accent/60 text-foreground ring-1 ring-border/80">
            <SearchX className="size-7" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">{t("notFound.code")}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{t("notFound.heading")}</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">{t("notFound.description")}</p>
          </div>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-4" aria-hidden />
              {t("notFound.goBack")}
            </Button>
            <Button asChild>
              <Link to="/explore">
                <Compass className="size-4" aria-hidden />
                {t("notFound.openExplore")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
