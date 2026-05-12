import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { AUTH_LAYOUT } from "../constants/auth-ui";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthShell({ eyebrow, title, description, children, footer }: AuthShellProps) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, oklch(0.75 0 0 / 0.35) 1px, transparent 0)`,
          backgroundSize: "24px 24px"
        }}
      />
      <div className="relative z-10 mx-auto grid min-h-dvh max-w-6xl md:grid-cols-2">
        <section className="relative hidden min-h-dvh flex-col justify-between overflow-hidden border-r border-border/50 md:flex">
          <img
            src={AUTH_LAYOUT.heroImagePath}
            alt={AUTH_LAYOUT.heroImageAlt}
            className="absolute inset-0 h-full w-full object-cover"
            decoding="async"
            fetchPriority="high"
          />
          <div
            className="absolute inset-0 bg-gradient-to-br from-background via-background/88 to-background/40"
            aria-hidden
          />
          <div className="relative z-10 flex flex-1 flex-col justify-between px-8 py-10 sm:px-10 sm:py-12">
            <div>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground drop-shadow-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-xs font-bold text-background shadow-sm">
                  E
                </span>
                EdTech Platform
              </Link>
              <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{eyebrow}</p>
          </div>
        </section>

        <section className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-8">
          <Card className="w-full max-w-md rounded-2xl border-border/60 bg-card/95 shadow-xl ring-1 ring-border/40 backdrop-blur-sm">
            <CardContent className="p-8 sm:p-10">
              <div className="mb-8 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{eyebrow}</p>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
              </div>
              {children}
              <div className="mt-8 border-t border-border/60 pt-6 text-sm text-muted-foreground">{footer}</div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
