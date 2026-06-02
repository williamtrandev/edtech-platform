import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ClipboardList, Loader2, Paperclip, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ASSIGNMENT_STATUS, ASSIGNMENT_SUBMISSION_STATUS } from "../constants/business";
import { useCourseAssignments, useSubmitAssignment } from "../hooks/use-assignments";
import { useI18n, type I18nKey } from "../i18n";
import { createAssignmentSubmissionFormSchema, type AssignmentSubmissionFormValues } from "../schemas/course.schema";
import { uploadService, type UploadedFile } from "../services/upload.service";
import type { Assignment } from "../services/assignment.service";
import { AssignmentRubricBreakdown } from "./assignment-rubric-editor";
import { FormField } from "./form-field";
import { LessonUploadField } from "./lesson-upload-field";
import { TextareaField } from "./textarea-field";

type LearnerAssignmentPanelProps = {
  courseId: string;
  enabled?: boolean;
  onSubmitted?: () => void;
};

function assignmentStatusLabel(assignment: Assignment, t: (key: I18nKey) => string) {
  if (!assignment.mySubmission) {
    return t("courseLearn.assignmentNotSubmitted");
  }

  if (assignment.mySubmission.status === ASSIGNMENT_SUBMISSION_STATUS.graded) {
    return t("courseLearn.assignmentGraded");
  }

  return t("courseLearn.assignmentPendingGrade");
}

export function LearnerAssignmentPanel({ courseId, enabled = true, onSubmitted }: LearnerAssignmentPanelProps) {
  const { t, formatError } = useI18n();
  const assignmentsQuery = useCourseAssignments(courseId, enabled);
  const submitAssignmentMutation = useSubmitAssignment(courseId);
  const submissionSchema = useMemo(() => createAssignmentSubmissionFormSchema(t), [t]);

  const publishedAssignments = useMemo(
    () => (assignmentsQuery.data ?? []).filter((assignment) => assignment.status === ASSIGNMENT_STATUS.published),
    [assignmentsQuery.data]
  );

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [uploadedSubmissionFile, setUploadedSubmissionFile] = useState<UploadedFile | null>(null);
  const [isUploadingSubmissionFile, setIsUploadingSubmissionFile] = useState(false);

  const selectedAssignment = publishedAssignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null;

  const submissionForm = useForm<AssignmentSubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      content: "",
      attachmentUrl: ""
    }
  });

  useEffect(() => {
    if (publishedAssignments.length === 0) {
      setSelectedAssignmentId(null);
      return;
    }

    if (!selectedAssignmentId || !publishedAssignments.some((assignment) => assignment.id === selectedAssignmentId)) {
      setSelectedAssignmentId(publishedAssignments[0].id);
    }
  }, [publishedAssignments, selectedAssignmentId]);

  useEffect(() => {
    if (!selectedAssignment) {
      submissionForm.reset({ content: "", attachmentUrl: "" });
      setUploadedSubmissionFile(null);
      return;
    }

    submissionForm.reset({
      content: selectedAssignment.mySubmission?.content ?? "",
      attachmentUrl: selectedAssignment.mySubmission?.attachmentUrl ?? ""
    });
    setUploadedSubmissionFile(null);
  }, [selectedAssignment, submissionForm]);

  const onSubmissionFileChange = async (file?: File) => {
    if (!file) {
      return;
    }

    setIsUploadingSubmissionFile(true);
    submissionForm.clearErrors("attachmentUrl");
    try {
      const uploaded = await uploadService.uploadFile(file, "assignment-submissions");
      setUploadedSubmissionFile(uploaded);
      submissionForm.setValue("attachmentUrl", uploaded.url, { shouldDirty: true, shouldValidate: true });
    } catch (error) {
      submissionForm.setError("attachmentUrl", {
        message: formatError(error, "courseDetail.assignmentSubmissionFileUploadFailed")
      });
    } finally {
      setIsUploadingSubmissionFile(false);
    }
  };

  const onSubmit = async (values: AssignmentSubmissionFormValues) => {
    if (!selectedAssignmentId) {
      return;
    }

    try {
      await submitAssignmentMutation.mutateAsync({
        assignmentId: selectedAssignmentId,
        payload: {
          content: values.content || null,
          attachmentUrl: values.attachmentUrl || null
        }
      });
      toast.success(t("courseDetail.assignmentSubmitted"));
      onSubmitted?.();
    } catch (error) {
      toast.error(formatError(error, "courseDetail.assignmentSubmitFailed"));
    }
  };

  if (!enabled) {
    return null;
  }

  if (assignmentsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {t("courseLearn.assignmentsLoading")}
      </div>
    );
  }

  if (assignmentsQuery.isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {formatError(assignmentsQuery.error, "courseLearn.assignmentsLoadFailed")}
      </div>
    );
  }

  if (publishedAssignments.length === 0) {
    return null;
  }

  return (
    <Card className="mt-8 border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <ClipboardList className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base">{t("courseLearn.assignmentsTitle")}</CardTitle>
            <CardDescription>{t("courseLearn.assignmentsDescription")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("courseLearn.assignmentsTitle")}>
          {publishedAssignments.map((assignment) => {
            const isSelected = assignment.id === selectedAssignmentId;
            return (
              <Button
                key={assignment.id}
                type="button"
                size="sm"
                variant={isSelected ? "default" : "outline"}
                className="h-9 max-w-full rounded-lg shadow-none"
                aria-selected={isSelected}
                onClick={() => setSelectedAssignmentId(assignment.id)}
              >
                <span className="truncate">{assignment.title}</span>
                <Badge variant="secondary" className="ml-2 h-5 rounded px-1.5 text-[10px] font-medium">
                  {assignmentStatusLabel(assignment, t)}
                </Badge>
              </Button>
            );
          })}
        </div>

        {selectedAssignment ? (
          <div className="grid gap-4 rounded-xl border border-border/60 bg-muted/15 p-4">
            {selectedAssignment.instructions ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{selectedAssignment.instructions}</p>
            ) : null}

            {selectedAssignment.attachmentUrl ? (
              <a
                className="inline-flex h-10 w-fit items-center rounded-md px-4 text-sm font-medium ring-1 ring-foreground/10 hover:bg-muted/40"
                href={selectedAssignment.attachmentUrl}
                rel="noreferrer"
                target="_blank"
              >
                <Paperclip className="mr-2 size-4" aria-hidden />
                {t("courseDetail.viewAssignmentFile")}
              </a>
            ) : null}

            {selectedAssignment.dueAt && new Date() > new Date(selectedAssignment.dueAt) ? (
              <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive" role="status">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <p>{t("courseDetail.assignmentLateWarning")}</p>
              </div>
            ) : null}

            <form className="grid gap-4" onSubmit={submissionForm.handleSubmit(onSubmit)} noValidate>
              <FormField
                id="learn-assignment-submission-content"
                label={t("courseDetail.assignmentSubmissionContent")}
                error={submissionForm.formState.errors.content?.message}
              >
                <TextareaField
                  id="learn-assignment-submission-content"
                  rows={8}
                  placeholder={t("courseDetail.assignmentSubmissionPlaceholder")}
                  {...submissionForm.register("content")}
                />
              </FormField>

              <FormField
                id="learn-assignment-submission-file"
                label={t("courseDetail.uploadSubmissionFileTitle")}
                hint={t("courseDetail.optional")}
                error={submissionForm.formState.errors.attachmentUrl?.message}
              >
                <LessonUploadField
                  id="learn-assignment-submission-file"
                  accept=".pdf,.txt,.md,.doc,.docx,.zip,application/pdf,text/plain,text/markdown,application/zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  isUploading={isUploadingSubmissionFile}
                  uploadedFileName={uploadedSubmissionFile?.fileName}
                  title={t("courseDetail.uploadSubmissionFileTitle")}
                  description={t("courseDetail.uploadSubmissionFileDescription")}
                  chooseLabel={t("courseDetail.chooseSubmissionFile")}
                  uploadingLabel={t("courseDetail.uploadingSubmissionFile")}
                  urlLabel={t("courseDetail.pasteSubmissionUrl")}
                  urlPlaceholder={t("courseDetail.submissionUrlPlaceholder")}
                  previewUrl={submissionForm.watch("attachmentUrl") ?? ""}
                  previewKind="resource"
                  previewFileName={uploadedSubmissionFile?.fileName}
                  previewMimeType={uploadedSubmissionFile?.mimeType}
                  previewTitle={t("courseDetail.submissionFilePreview")}
                  previewDescription={t("courseDetail.submissionFilePreviewDescription")}
                  openPreviewLabel={t("courseDetail.viewSubmissionFile")}
                  previewUnavailableLabel={t("courseDetail.previewUnavailable")}
                  previewLoadingLabel={t("courseDetail.previewLoading")}
                  previewLoadFailedLabel={t("courseDetail.previewLoadFailed")}
                  previewEmptyLabel={t("courseDetail.previewEmpty")}
                  Icon={Paperclip}
                  onFileChange={(file) => void onSubmissionFileChange(file)}
                  onUrlChange={() => setUploadedSubmissionFile(null)}
                  urlInputProps={submissionForm.register("attachmentUrl")}
                />
              </FormField>

              {selectedAssignment.mySubmission?.status === ASSIGNMENT_SUBMISSION_STATUS.graded ? (
                <div className="rounded-xl bg-muted/30 px-3 py-3 text-sm ring-1 ring-foreground/10">
                  <p className="font-medium">
                    {t("courseDetail.assignmentScore")}: {selectedAssignment.mySubmission.score ?? "—"} /{" "}
                    {selectedAssignment.maxScore ?? "—"}
                  </p>
                  {selectedAssignment.mySubmission.rubricScores?.length ? (
                    <AssignmentRubricBreakdown scores={selectedAssignment.mySubmission.rubricScores} className="mt-4" />
                  ) : null}
                  {selectedAssignment.mySubmission.feedback ? (
                    <p className="mt-2 text-muted-foreground">{selectedAssignment.mySubmission.feedback}</p>
                  ) : null}
                </div>
              ) : null}

              {selectedAssignment.mySubmission?.isLate ? (
                <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <p>{t("courseDetail.assignmentSubmittedLate")}</p>
                </div>
              ) : null}

              <Button
                className="h-10 w-fit rounded-lg font-medium shadow-none"
                disabled={submitAssignmentMutation.isPending || isUploadingSubmissionFile}
                type="submit"
              >
                <Send className="mr-2 size-4" aria-hidden />
                {submitAssignmentMutation.isPending ? t("courseDetail.submittingAssignment") : t("courseDetail.submitAssignment")}
              </Button>
            </form>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
