import { Controller, type Control, type FieldErrors, type UseFormSetValue, type UseFormWatch } from "react-hook-form";
import { EXAM_SCOPE } from "../constants/business";
import { useI18n } from "../i18n";
import type { ExamFormValues } from "../schemas/course.schema";
import type { Lesson } from "../services/course.service";
import { FormField } from "./form-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ExamScopeFieldsProps = {
  control: Control<ExamFormValues>;
  setValue: UseFormSetValue<ExamFormValues>;
  watch: UseFormWatch<ExamFormValues>;
  errors: FieldErrors<ExamFormValues>;
  lessons: Lesson[];
  idPrefix?: string;
};

export function ExamScopeFields({ control, setValue, watch, errors, lessons, idPrefix = "exam" }: ExamScopeFieldsProps) {
  const { t } = useI18n();
  const scope = watch("scope");
  const activeLessons = lessons.filter((lesson) => !lesson.archivedAt);

  return (
    <>
      <FormField
        id={`${idPrefix}-scope`}
        label={t("courseDetail.exerciseScope")}
        hint={t("courseDetail.exerciseScopeHint")}
        error={errors.scope?.message}
      >
        <Controller
          control={control}
          name="scope"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value: typeof EXAM_SCOPE.lesson | typeof EXAM_SCOPE.course) => {
                field.onChange(value);
                if (value === EXAM_SCOPE.course) {
                  setValue("lessonId", "", { shouldDirty: true });
                }
              }}
            >
              <SelectTrigger id={`${idPrefix}-scope`} className="h-10 w-full rounded-md border-border/80 shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EXAM_SCOPE.lesson}>{t("courseDetail.exerciseScopeLesson")}</SelectItem>
                <SelectItem value={EXAM_SCOPE.course}>{t("courseDetail.exerciseScopeCourse")}</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      {scope === EXAM_SCOPE.lesson ? (
        <FormField
          id={`${idPrefix}-lesson`}
          label={t("courseDetail.exerciseLinkedLesson")}
          hint={t("courseDetail.exerciseLinkedLessonHint")}
          error={errors.lessonId?.message}
        >
          <Controller
            control={control}
            name="lessonId"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger id={`${idPrefix}-lesson`} className="h-10 w-full rounded-md border-border/80 shadow-none">
                  <SelectValue placeholder={t("courseDetail.exerciseLinkedLessonPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {activeLessons.length ? (
                    activeLessons.map((lesson) => (
                      <SelectItem key={lesson.id} value={lesson.id}>
                        {lesson.sortOrder}. {lesson.title}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__none" disabled>
                      {t("courseDetail.exerciseNoLessons")}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      ) : null}

      <p className="text-xs leading-5 text-muted-foreground">{t("courseDetail.exerciseAutoGradeHint")}</p>
    </>
  );
}
