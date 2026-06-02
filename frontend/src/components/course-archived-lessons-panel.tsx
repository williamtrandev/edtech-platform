import { ArchiveRestore, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Lesson } from "../services/course.service";
import { type I18nKey, useI18n } from "../i18n";

type CourseArchivedLessonsPanelProps = {
  lessons: Lesson[];
  isRestoring: boolean;
  restoringLessonId: string | null;
  onRestore: (lessonId: string) => void;
};

export function CourseArchivedLessonsPanel({
  lessons,
  isRestoring,
  restoringLessonId,
  onRestore
}: CourseArchivedLessonsPanelProps) {
  const { t } = useI18n();

  if (lessons.length === 0) {
    return null;
  }

  return (
    <section
      className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 p-4"
      aria-label={t("courseDetail.archivedLessonsTitle")}
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{t("courseDetail.archivedLessonsTitle")}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t("courseDetail.archivedLessonsDescription")}</p>
      </div>
      <ul className="space-y-2">
        {lessons.map((lesson) => {
          const isBusy = isRestoring && restoringLessonId === lesson.id;

          return (
            <li
              key={lesson.id}
              className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px] font-medium">
                    {t(`lessonType.${lesson.contentType}` as I18nKey)}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">{t("courseDetail.archivedLessonBadge")}</span>
                </div>
                <p className="mt-1 truncate text-sm font-medium text-foreground">{lesson.title}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 rounded-md"
                disabled={isRestoring}
                aria-label={t("courseDetail.restoreLesson")}
                onClick={() => onRestore(lesson.id)}
              >
                {isBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ArchiveRestore className="size-4" aria-hidden />}
                <span className="sr-only sm:not-sr-only sm:ml-2">{t("courseDetail.restoreLesson")}</span>
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
