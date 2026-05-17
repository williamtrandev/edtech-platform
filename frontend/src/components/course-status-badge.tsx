import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { COURSE_STATUS, type CourseStatus } from "../constants/business";

type CourseStatusBadgeProps = {
  status: CourseStatus;
  label: string;
  className?: string;
};

const statusClassName: Record<CourseStatus, string> = {
  [COURSE_STATUS.draft]:
    "border-amber-700 bg-amber-700 text-white dark:border-amber-600 dark:bg-amber-600 dark:text-white",
  [COURSE_STATUS.published]:
    "border-emerald-700 bg-emerald-700 text-white dark:border-emerald-600 dark:bg-emerald-600 dark:text-white",
  [COURSE_STATUS.archived]:
    "border-zinc-800 bg-zinc-700 text-white dark:border-zinc-600 dark:bg-zinc-600 dark:text-white"
};

export function CourseStatusBadge({ status, label, className }: CourseStatusBadgeProps) {
  return (
    <Badge className={cn("rounded-md border px-2.5 py-0.5 text-xs font-medium shadow-sm", statusClassName[status], className)} variant="outline">
      {label}
    </Badge>
  );
}
