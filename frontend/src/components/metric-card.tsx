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
        "rounded-lg bg-card/95 shadow-none transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:bg-card hover:shadow-sm",
        className
      )}
    >
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>{label}</span>
          <span className="flex size-8 items-center justify-center rounded-md bg-accent/55 text-foreground ring-1 ring-border/70">
            <Icon className="size-4" aria-hidden />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        {hint ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
