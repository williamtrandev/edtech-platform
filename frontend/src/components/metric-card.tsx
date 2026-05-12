import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  className?: string;
};

export function MetricCard({ label, value, hint, icon: Icon, className }: MetricCardProps) {
  return (
    <Card
      className={cn(
        "rounded-2xl border-border/60 bg-card/80 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md",
        className
      )}
    >
      <CardHeader className="pb-2 pt-5">
        <CardTitle className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>{label}</span>
          <span className="flex size-9 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-foreground">
            <Icon className="size-4" aria-hidden />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-5">
        <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">{value}</p>
        {hint ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
