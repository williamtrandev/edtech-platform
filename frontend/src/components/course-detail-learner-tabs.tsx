import { cn } from "@/lib/utils";

export type CourseDetailLearnerTabItem = {
  id: string;
  label: string;
  count?: number;
};

type CourseDetailLearnerTabsProps = {
  items: CourseDetailLearnerTabItem[];
  activeId: string;
  onChange: (id: string) => void;
};

export function CourseDetailLearnerTabs({ items, activeId, onChange }: CourseDetailLearnerTabsProps) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-flex min-w-full gap-1 rounded-2xl bg-muted/30 p-1.5 ring-1 ring-foreground/10 sm:min-w-0">
        {items.map((item) => {
          const active = activeId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-200",
                "active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
                active
                  ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onChange(item.id)}
            >
              {item.label}
              {typeof item.count === "number" ? (
                <span
                  className={cn(
                    "inline-flex min-w-5 items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                    active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
