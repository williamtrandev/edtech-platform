import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthShell({ eyebrow, title, description, children, footer }: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, oklch(0.75 0 0 / 0.35) 1px, transparent 0)`,
          backgroundSize: "24px 24px"
        }}
      />
      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
        <section className="hidden flex-col justify-between border-r border-border/50 bg-muted/25 px-10 py-12 lg:flex">
          <div>
            <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-xs font-bold text-background">E</span>
              EdTech Platform
            </Link>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{eyebrow}</p>
        </section>

        <section className="flex items-center justify-center px-4 py-10 sm:px-8">
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
