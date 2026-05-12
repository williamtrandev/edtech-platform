import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  className?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, icon: Icon, className, action }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/15 px-6 py-14 text-center ring-1 ring-border/30",
        className
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-background shadow-sm">
        <Icon className="size-6 text-muted-foreground" aria-hidden />
      </span>
      <p className="mt-4 text-base font-semibold tracking-tight text-foreground">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
