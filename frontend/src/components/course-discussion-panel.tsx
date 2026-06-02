import { Loader2, MessageSquare, Reply, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TextareaField } from "./textarea-field";
import { useCreateDiscussionComment, useDeleteDiscussionComment, useCourseDiscussionComments } from "../hooks/use-discussion";
import { useI18n } from "../i18n";
import type { DiscussionComment } from "../services/discussion.service";

type CourseDiscussionPanelProps = {
  courseId: string;
  lessonId: string;
  currentUserId?: string;
  canParticipate: boolean;
};

function formatAuthorLabel(email: string) {
  const localPart = email.split("@")[0]?.trim();
  return localPart || email;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

type CommentThreadProps = {
  comment: DiscussionComment;
  currentUserId?: string;
  canParticipate: boolean;
  onReply: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  isDeleting: boolean;
  replyLabel: string;
  deleteLabel: string;
};

function CommentThread({ comment, currentUserId, canParticipate, onReply, onDelete, isDeleting, replyLabel, deleteLabel }: CommentThreadProps) {
  const canDelete = Boolean(currentUserId && comment.userId === currentUserId);

  return (
    <article className="rounded-xl border border-border/70 bg-muted/10 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{formatAuthorLabel(comment.user.email)}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{formatTimestamp(comment.createdAt)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canParticipate ? (
            <Button type="button" variant="ghost" size="sm" className="h-8 rounded-md px-2 text-xs" onClick={() => onReply(comment.id)}>
              <Reply className="mr-1 size-3.5" aria-hidden />
              {replyLabel}
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-md px-2 text-xs text-destructive hover:text-destructive"
              disabled={isDeleting}
              onClick={() => onDelete(comment.id)}
            >
              <Trash2 className="size-3.5" aria-hidden />
              <span className="sr-only">{deleteLabel}</span>
            </Button>
          ) : null}
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{comment.body}</p>

      {comment.replies?.length ? (
        <div className="mt-3 space-y-2 border-l border-border/60 pl-3">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="rounded-lg bg-background/70 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-foreground">{formatAuthorLabel(reply.user.email)}</p>
                  <p className="text-[10px] text-muted-foreground">{formatTimestamp(reply.createdAt)}</p>
                </div>
                {currentUserId && reply.userId === currentUserId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-md px-2 text-xs text-destructive hover:text-destructive"
                    disabled={isDeleting}
                    onClick={() => onDelete(reply.id)}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    <span className="sr-only">{deleteLabel}</span>
                  </Button>
                ) : null}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{reply.body}</p>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function CourseDiscussionPanel({ courseId, lessonId, currentUserId, canParticipate }: CourseDiscussionPanelProps) {
  const { t, formatError } = useI18n();
  const commentsQuery = useCourseDiscussionComments(courseId, lessonId, canParticipate);
  const createMutation = useCreateDiscussionComment(courseId, lessonId);
  const deleteMutation = useDeleteDiscussionComment(courseId);
  const [draft, setDraft] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);

  const comments = commentsQuery.data?.items ?? [];
  const replyTarget = useMemo(() => comments.find((item) => item.id === replyToId), [comments, replyToId]);

  const handleSubmit = async () => {
    const body = draft.trim();
    if (!body) {
      return;
    }

    try {
      await createMutation.mutateAsync({
        body,
        parentId: replyToId
      });
      setDraft("");
      setReplyToId(null);
    } catch (error) {
      toast.error(formatError(error, "errors.unexpected"));
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteMutation.mutateAsync(commentId);
    } catch (error) {
      toast.error(formatError(error, "errors.unexpected"));
    }
  };

  return (
    <section className="mt-8 border-t border-border/60 pt-6" aria-labelledby="lesson-discussion-heading">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="size-4 text-muted-foreground" aria-hidden />
        <h2 id="lesson-discussion-heading" className="text-base font-semibold text-foreground">
          {t("courseLearn.discussionTitle")}
        </h2>
      </div>

      {canParticipate ? (
        <div className="mb-5 space-y-2">
          {replyTarget ? (
            <p className="text-xs text-muted-foreground">
              {t("courseLearn.discussionReplyingTo").replace("{author}", formatAuthorLabel(replyTarget.user.email))}
              <Button type="button" variant="link" className="ml-2 h-auto p-0 text-xs" onClick={() => setReplyToId(null)}>
                {t("courseLearn.discussionCancelReply")}
              </Button>
            </p>
          ) : null}
          <TextareaField
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("courseLearn.discussionPlaceholder")}
            maxLength={2000}
            aria-label={t("courseLearn.discussionPlaceholder")}
            className="min-h-[96px]"
          />
          <div className="flex justify-end">
            <Button type="button" size="sm" className="h-9 rounded-lg" disabled={createMutation.isPending || !draft.trim()} onClick={() => void handleSubmit()}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  {t("courseLearn.discussionPosting")}
                </>
              ) : (
                t("courseLearn.discussionPost")
              )}
            </Button>
          </div>
        </div>
      ) : null}

      {commentsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-xl bg-muted/40" aria-hidden />
          ))}
        </div>
      ) : commentsQuery.isError ? (
        <p className="text-sm text-destructive">{formatError(commentsQuery.error, "errors.unexpected")}</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("courseLearn.discussionEmpty")}</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              canParticipate={canParticipate}
              onReply={setReplyToId}
              onDelete={(commentId) => void handleDelete(commentId)}
              isDeleting={deleteMutation.isPending}
              replyLabel={t("courseLearn.discussionReply")}
              deleteLabel={t("courseLearn.discussionDelete")}
            />
          ))}
        </div>
      )}
    </section>
  );
}
