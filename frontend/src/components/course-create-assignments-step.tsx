import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Paperclip, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { STUDIO_EDITOR_TITLE, STUDIO_FORM_STACK, STUDIO_LIST, STUDIO_LIST_ITEM, STUDIO_LIST_ITEM_SELECTED } from "../lib/studio-layout";
import { FormField } from "./form-field";
import { CourseListSkeleton } from "./skeleton";
import { TextareaField } from "./textarea-field";
import { LessonUploadField } from "./lesson-upload-field";
import { ASSIGNMENT_STATUS } from "../constants/business";
import { useCourseAssignments, useCreateAssignment, useUpdateAssignment } from "../hooks/use-assignments";
import { createAssignmentFormSchema, type AssignmentFormValues } from "../schemas/course.schema";
import type { Assignment, CreateAssignmentPayload } from "../services/assignment.service";
import { uploadService, type UploadedFile } from "../services/upload.service";
import { type I18nKey, useI18n } from "../i18n";

export type PendingAssignment = {
  id: string;
  payload: CreateAssignmentPayload;
};

type CourseCreateAssignmentsStepProps = {
  courseId: string | null;
  pendingAssignments: PendingAssignment[];
  onPendingAssignmentsChange: (assignments: PendingAssignment[]) => void;
};

export function CourseCreateAssignmentsStep({ courseId, pendingAssignments, onPendingAssignmentsChange }: CourseCreateAssignmentsStepProps) {
  const { t } = useI18n();
  const [selectedSavedAssignmentId, setSelectedSavedAssignmentId] = useState<string | null>(null);
  const [selectedPendingId, setSelectedPendingId] = useState<string | null>(null);
  const [isUploadingAssignmentFile, setIsUploadingAssignmentFile] = useState(false);
  const [uploadedAssignmentFile, setUploadedAssignmentFile] = useState<UploadedFile | null>(null);

  const assignmentsQuery = useCourseAssignments(courseId ?? "", Boolean(courseId));
  const createAssignmentMutation = useCreateAssignment(courseId ?? "");
  const updateAssignmentMutation = useUpdateAssignment(courseId ?? "");

  const assignmentForm = useForm<AssignmentFormValues>({
    resolver: zodResolver(createAssignmentFormSchema(t)),
    defaultValues: {
      title: "",
      instructions: "",
      status: ASSIGNMENT_STATUS.draft,
      dueAt: "",
      maxScore: "",
      attachmentUrl: ""
    }
  });

  const savedAssignments = assignmentsQuery.data ?? [];

  useEffect(() => {
    if (selectedSavedAssignmentId && !savedAssignments.some((assignment) => assignment.id === selectedSavedAssignmentId)) {
      resetAssignmentSelection();
    }
  }, [savedAssignments, selectedSavedAssignmentId]);

  const resetAssignmentSelection = () => {
    setSelectedSavedAssignmentId(null);
    setSelectedPendingId(null);
    setUploadedAssignmentFile(null);
    assignmentForm.reset({
      title: "",
      instructions: "",
      status: ASSIGNMENT_STATUS.draft,
      dueAt: "",
      maxScore: "",
      attachmentUrl: ""
    });
  };

  const onNewAssignment = () => {
    resetAssignmentSelection();
  };

  const onSelectSavedAssignment = (assignment: Assignment) => {
    setSelectedSavedAssignmentId(assignment.id);
    setSelectedPendingId(null);
    setUploadedAssignmentFile(null);
    assignmentForm.reset({
      title: assignment.title,
      instructions: assignment.instructions ?? "",
      status: assignment.status,
      dueAt: assignment.dueAt ? assignment.dueAt.slice(0, 10) : "",
      maxScore: assignment.maxScore ?? "",
      attachmentUrl: assignment.attachmentUrl ?? ""
    });
  };

  const onSelectPending = (assignment: PendingAssignment) => {
    setSelectedPendingId(assignment.id);
    setSelectedSavedAssignmentId(null);
    setUploadedAssignmentFile(null);
    assignmentForm.reset({
      title: assignment.payload.title,
      instructions: assignment.payload.instructions ?? "",
      status: assignment.payload.status,
      dueAt: assignment.payload.dueAt ? assignment.payload.dueAt.slice(0, 10) : "",
      maxScore: assignment.payload.maxScore ?? "",
      attachmentUrl: assignment.payload.attachmentUrl ?? ""
    });
  };

  const onDeletePending = (assignmentId: string) => {
    onPendingAssignmentsChange(pendingAssignments.filter((item) => item.id !== assignmentId));
    if (selectedPendingId === assignmentId) {
      resetAssignmentSelection();
    }
  };

  const onAssignmentFileChange = async (file?: File) => {
    if (!file) {
      return;
    }

    setIsUploadingAssignmentFile(true);
    assignmentForm.clearErrors("attachmentUrl");
    try {
      const uploaded = await uploadService.uploadFile(file, "assignment-files");
      setUploadedAssignmentFile(uploaded);
      assignmentForm.setValue("attachmentUrl", uploaded.url, { shouldDirty: true, shouldValidate: true });
    } catch (error) {
      assignmentForm.setError("attachmentUrl", {
        message: error instanceof Error ? error.message : t("courseDetail.assignmentFileUploadFailed")
      });
    } finally {
      setIsUploadingAssignmentFile(false);
    }
  };

  const onSubmitAssignment = async (values: AssignmentFormValues) => {
    const payload: CreateAssignmentPayload = {
      title: values.title.trim(),
      instructions: values.instructions?.trim() || null,
      status: values.status,
      dueAt: values.dueAt?.trim() || null,
      maxScore: values.maxScore === "" ? null : Number(values.maxScore),
      attachmentUrl: values.attachmentUrl?.trim() || null
    };

    if (courseId) {
      try {
        if (selectedSavedAssignmentId) {
          await updateAssignmentMutation.mutateAsync({ assignmentId: selectedSavedAssignmentId, payload });
          toast.success(t("courseDetail.assignmentUpdated"));
        } else {
          const created = await createAssignmentMutation.mutateAsync(payload);
          setSelectedSavedAssignmentId(created.id);
          setSelectedPendingId(null);
          toast.success(t("courseDetail.assignmentCreated"));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("courseDetail.assignmentSaveFailed"));
      }
      return;
    }

    if (selectedPendingId) {
      onPendingAssignmentsChange(
        pendingAssignments.map((item) => (item.id === selectedPendingId ? { id: item.id, payload } : item))
      );
    } else {
      onPendingAssignmentsChange([...pendingAssignments, { id: crypto.randomUUID(), payload }]);
    }
    resetAssignmentSelection();
  };

  const listCount = courseId ? savedAssignments.length : pendingAssignments.length;
  const isAssignmentSubmitPending = createAssignmentMutation.isPending || updateAssignmentMutation.isPending;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] xl:items-start">
      <Card className="min-w-0">
        <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border pb-4">
          <div className="min-w-0">
            <CardTitle className={STUDIO_EDITOR_TITLE}>{t("courseDetail.tabAssignments")}</CardTitle>
            <CardDescription>{t("courseStudio.assignmentsStepListDescription")}</CardDescription>
          </div>
          {courseId ? (
            <Button type="button" variant="outline" size="sm" className="h-9 shrink-0 rounded-md shadow-none" onClick={onNewAssignment}>
              {t("courseDetail.newAssignment")}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="pt-6">
          {courseId && assignmentsQuery.isLoading ? <CourseListSkeleton rows={3} /> : null}
          {listCount ? (
            <div className={STUDIO_LIST}>
              <div className="grid gap-1">
                {courseId
                  ? savedAssignments.map((assignment) => {
                      const selected = selectedSavedAssignmentId === assignment.id;
                      return (
                        <button
                          key={assignment.id}
                          type="button"
                          className={cn(STUDIO_LIST_ITEM, selected ? STUDIO_LIST_ITEM_SELECTED : undefined)}
                          onClick={() => onSelectSavedAssignment(assignment)}
                        >
                          <div className="min-w-0 flex-1 text-left">
                            <p className="truncate text-sm font-medium">{assignment.title}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
                                {t(`assignmentStatus.${assignment.status}` as I18nKey)}
                              </Badge>
                              {assignment.maxScore ? (
                                <span className="text-[11px] text-muted-foreground">
                                  {assignment.maxScore} {t("courseDetail.points")}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  : pendingAssignments.map((assignment) => {
                      const selected = selectedPendingId === assignment.id;
                      return (
                        <button
                          key={assignment.id}
                          type="button"
                          className={cn(STUDIO_LIST_ITEM, selected ? STUDIO_LIST_ITEM_SELECTED : undefined)}
                          onClick={() => onSelectPending(assignment)}
                        >
                          <div className="min-w-0 flex-1 text-left">
                            <p className="truncate text-sm font-medium">{assignment.payload.title}</p>
                            <Badge variant="outline" className="mt-1 h-5 rounded-md px-1.5 text-[10px]">
                              {t(`assignmentStatus.${assignment.payload.status}` as I18nKey)}
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="size-8 shrink-0 rounded-md p-0 text-muted-foreground hover:text-destructive"
                            aria-label={t("courseDetail.archiveAssignment")}
                            onClick={(event) => {
                              event.stopPropagation();
                              onDeletePending(assignment.id);
                            }}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        </button>
                      );
                    })}
              </div>
            </div>
          ) : !courseId || !assignmentsQuery.isLoading ? (
            <div className="rounded-xl bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
              <FileText className="mx-auto mb-2 size-8 opacity-60" aria-hidden />
              {t("courseStudio.assignmentsStepEmpty")}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className={STUDIO_EDITOR_TITLE}>
            {selectedSavedAssignmentId || selectedPendingId ? t("courseDetail.editAssignment") : t("courseDetail.addAssignment")}
          </CardTitle>
          <CardDescription>{t("courseStudio.assignmentsStepFormDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form className={STUDIO_FORM_STACK} onSubmit={assignmentForm.handleSubmit(onSubmitAssignment)} noValidate>
            <FormField id="wizard-assignment-title" label={t("courseDetail.assignmentTitle")} error={assignmentForm.formState.errors.title?.message}>
              <Input id="wizard-assignment-title" placeholder={t("courseDetail.assignmentTitlePlaceholder")} {...assignmentForm.register("title")} />
            </FormField>
            <FormField
              id="wizard-assignment-instructions"
              label={t("courseDetail.assignmentInstructions")}
              error={assignmentForm.formState.errors.instructions?.message}
            >
              <TextareaField
                id="wizard-assignment-instructions"
                rows={6}
                placeholder={t("courseDetail.assignmentInstructionsPlaceholder")}
                {...assignmentForm.register("instructions")}
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="wizard-assignment-due-at" label={t("courseDetail.assignmentDueAt")} hint={t("courseDetail.optional")} error={assignmentForm.formState.errors.dueAt?.message}>
                <Input id="wizard-assignment-due-at" type="date" {...assignmentForm.register("dueAt")} />
              </FormField>
              <FormField id="wizard-assignment-max-score" label={t("courseDetail.assignmentMaxScore")} error={assignmentForm.formState.errors.maxScore?.message}>
                <Input id="wizard-assignment-max-score" inputMode="numeric" min={1} type="number" placeholder="100" {...assignmentForm.register("maxScore")} />
              </FormField>
            </div>
            <FormField
              id="wizard-assignment-attachment-url"
              label={t("courseDetail.assignmentAttachmentUrl")}
              hint={t("courseDetail.optional")}
              error={assignmentForm.formState.errors.attachmentUrl?.message}
            >
              <LessonUploadField
                id="wizard-assignment-attachment-url"
                accept=".pdf,.txt,.md,.doc,.docx,.zip,application/pdf,text/plain,text/markdown,application/zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                isUploading={isUploadingAssignmentFile}
                uploadedFileName={uploadedAssignmentFile?.fileName}
                title={t("courseDetail.uploadAssignmentFileTitle")}
                description={t("courseDetail.uploadAssignmentFileDescription")}
                chooseLabel={t("courseDetail.chooseAssignmentFile")}
                uploadingLabel={t("courseDetail.uploadingAssignmentFile")}
                urlLabel={t("courseDetail.pasteAssignmentUrl")}
                urlPlaceholder={t("courseDetail.assignmentUrlPlaceholder")}
                previewUrl={assignmentForm.watch("attachmentUrl") ?? ""}
                previewKind="resource"
                previewFileName={uploadedAssignmentFile?.fileName}
                previewMimeType={uploadedAssignmentFile?.mimeType}
                previewTitle={t("courseDetail.assignmentFilePreview")}
                previewDescription={t("courseDetail.assignmentFilePreviewDescription")}
                openPreviewLabel={t("courseDetail.viewAssignmentFile")}
                previewUnavailableLabel={t("courseDetail.previewUnavailable")}
                previewLoadingLabel={t("courseDetail.previewLoading")}
                previewLoadFailedLabel={t("courseDetail.previewLoadFailed")}
                previewEmptyLabel={t("courseDetail.previewEmpty")}
                Icon={Paperclip}
                onFileChange={(file) => void onAssignmentFileChange(file)}
                onUrlChange={() => setUploadedAssignmentFile(null)}
                urlInputProps={assignmentForm.register("attachmentUrl")}
              />
            </FormField>
            {courseId ? (
              <FormField id="wizard-assignment-status" label={t("courseDetail.status")} error={assignmentForm.formState.errors.status?.message}>
                <Controller
                  control={assignmentForm.control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="wizard-assignment-status" className="h-10 w-full rounded-md border-border/80 shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ASSIGNMENT_STATUS.draft}>{t("assignmentStatus.DRAFT")}</SelectItem>
                        <SelectItem value={ASSIGNMENT_STATUS.published}>{t("assignmentStatus.PUBLISHED")}</SelectItem>
                        <SelectItem value={ASSIGNMENT_STATUS.archived}>{t("assignmentStatus.ARCHIVED")}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            ) : null}
            <div className="flex justify-end gap-2">
              {selectedSavedAssignmentId || selectedPendingId ? (
                <Button type="button" variant="outline" className="h-10 rounded-md shadow-none" onClick={onNewAssignment}>
                  {t("courseDetail.newAssignment")}
                </Button>
              ) : null}
              <Button className="h-10 rounded-md font-medium shadow-none" disabled={isAssignmentSubmitPending || isUploadingAssignmentFile} type="submit">
                {isAssignmentSubmitPending
                  ? t("courseDetail.savingAssignment")
                  : selectedSavedAssignmentId || selectedPendingId
                    ? t("courseDetail.saveAssignment")
                    : t("courseDetail.createAssignment")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
