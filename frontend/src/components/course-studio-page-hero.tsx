import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatPillProps = {
  label: string;
  value: string | number;
  icon: ReactNode;
  loading?: boolean;
};

function StatPill({ label, value, icon, loading }: StatPillProps) {
  return (
    <div className="flex min-w-[7.5rem] flex-1 items-center gap-3 rounded-xl bg-background/80 px-4 py-3 ring-1 ring-foreground/10 backdrop-blur-sm">
      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold tabular-nums tracking-tight text-foreground">{loading ? "..." : value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export type CourseStudioPageHeroStat = {
  label: string;
  value: string | number;
  icon: ReactNode;
};

type CourseStudioPageHeroProps = {
  title: string;
  description: string;
  icon: ReactNode;
  stats: CourseStudioPageHeroStat[];
  loading?: boolean;
  action?: ReactNode;
  className?: string;
};

export function CourseStudioPageHero({ title, description, icon, stats, loading, action, className }: CourseStudioPageHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/8 via-card to-card ring-1 ring-foreground/10",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_0%_0%,var(--color-primary)/0.14,transparent_60%)]"
      />
      <div className="relative flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20">
            {icon}
          </span>
          <div className="min-w-0 space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
            {action ? <div className="pt-1">{action}</div> : null}
          </div>
        </div>
        {stats.length ? (
          <div className="flex flex-wrap gap-3 lg:max-w-xl lg:justify-end">
            {stats.map((stat) => (
              <StatPill key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} loading={loading} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
