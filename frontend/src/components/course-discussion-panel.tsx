import { Loader2, MessageSquare, Reply, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TextareaField } from "./textarea-field";
import { useCreateDiscussionComment, useDeleteDiscussionComment, useCourseDiscussionComments } from "../hooks/use-discussion";
import { useI18n } from "../i18n";
import type { Language } from "../constants/preferences";
import type { DiscussionComment } from "../services/discussion.service";

type CourseDiscussionPanelProps = {
  courseId: string;
  lessonId: string;
  currentUserId?: string;
  currentUserEmail?: string;
  canParticipate: boolean;
};

const AVATAR_PALETTE = [
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300"
] as const;

function getInitials(email: string) {
  const localPart = email.split("@")[0] ?? email;
  const segments = localPart.split(/[._-]+/).filter(Boolean);

  if (segments.length >= 2) {
    return `${segments[0]?.[0] ?? ""}${segments[1]?.[0] ?? ""}`.toUpperCase();
  }

  return localPart.slice(0, 2).toUpperCase();
}

function formatAuthorLabel(email: string) {
  const localPart = email.split("@")[0]?.trim();
  if (!localPart) {
    return email;
  }

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function intlLocale(language: Language) {
  return language === "vi" ? "vi-VN" : "en-US";
}

function formatCommentTime(value: string, language: Language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const locale = intlLocale(language);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 7 * 24 * 60) {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

    if (diffMinutes < 1) {
      return rtf.format(0, "minute");
    }
    if (diffMinutes < 60) {
      return rtf.format(-diffMinutes, "minute");
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return rtf.format(-diffHours, "hour");
    }

    const diffDays = Math.floor(diffHours / 24);
    return rtf.format(-diffDays, "day");
  }

  return date.toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function avatarTone(email: string) {
  let hash = 0;
  for (let index = 0; index < email.length; index += 1) {
    hash = (hash + email.charCodeAt(index)) % AVATAR_PALETTE.length;
  }
  return AVATAR_PALETTE[hash] ?? AVATAR_PALETTE[0];
}

function CommentAvatar({ email, size = "md" }: { email: string; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "size-7 text-[10px]" : "size-9 text-xs";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tabular-nums ring-1 ring-border/50",
        sizeClass,
        avatarTone(email)
      )}
      aria-hidden
    >
      {getInitials(email)}
    </span>
  );
}

type CommentComposerProps = {
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onCancelReply?: () => void;
  isSubmitting: boolean;
  canParticipate: boolean;
  currentUserEmail?: string;
  replyAuthor?: string;
  placeholder: string;
  postLabel: string;
  postingLabel: string;
  replyingToLabel: string;
  cancelReplyLabel: string;
};

function CommentComposer({
  draft,
  onDraftChange,
  onSubmit,
  onCancelReply,
  isSubmitting,
  canParticipate,
  currentUserEmail,
  replyAuthor,
  placeholder,
  postLabel,
  postingLabel,
  replyingToLabel,
  cancelReplyLabel
}: CommentComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!replyAuthor) {
      return;
    }

    textareaRef.current?.focus();
  }, [replyAuthor]);

  if (!canParticipate) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border/70 bg-muted/15 p-4 sm:p-5">
      {replyAuthor && onCancelReply ? (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <p className="min-w-0 truncate text-sm text-foreground">
            <Reply className="mr-1.5 inline size-3.5 align-[-2px] text-primary" aria-hidden />
            {replyingToLabel.replace("{author}", replyAuthor)}
          </p>
          <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 rounded-lg px-2 text-xs" onClick={onCancelReply}>
            <X className="mr-1 size-3.5" aria-hidden />
            {cancelReplyLabel}
          </Button>
        </div>
      ) : null}

      <div className="flex gap-3">
        <CommentAvatar email={currentUserEmail ?? "learner@example.com"} />
        <div className="min-w-0 flex-1 space-y-3">
          <TextareaField
            ref={textareaRef}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder={placeholder}
            maxLength={2000}
            aria-label={placeholder}
            className="min-h-[88px] resize-none rounded-xl bg-background/80"
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                onSubmit();
              }
            }}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">{draft.length}/2000</p>
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-xl px-4 shadow-none"
              disabled={isSubmitting || !draft.trim()}
              onClick={onSubmit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  {postingLabel}
                </>
              ) : (
                postLabel
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

type CommentActionsProps = {
  canReply: boolean;
  canDelete: boolean;
  isDeleting: boolean;
  onReply: () => void;
  onDelete: () => void;
  replyLabel: string;
  deleteLabel: string;
};

function CommentActions({ canReply, canDelete, isDeleting, onReply, onDelete, replyLabel, deleteLabel }: CommentActionsProps) {
  if (!canReply && !canDelete) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      {canReply ? (
        <Button type="button" variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground" onClick={onReply}>
          <Reply className="mr-1 size-3.5" aria-hidden />
          {replyLabel}
        </Button>
      ) : null}
      {canDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 rounded-lg px-2 text-xs text-muted-foreground hover:text-destructive"
          disabled={isDeleting}
          onClick={onDelete}
        >
          <Trash2 className="mr-1 size-3.5" aria-hidden />
          {deleteLabel}
        </Button>
      ) : null}
    </div>
  );
}

type ReplyRowProps = {
  reply: DiscussionComment;
  language: Language;
  currentUserId?: string;
  canDelete: boolean;
  isDeleting: boolean;
  onDelete: (commentId: string) => void;
  deleteLabel: string;
};

function ReplyRow({ reply, language, currentUserId, canDelete, isDeleting, onDelete, deleteLabel }: ReplyRowProps) {
  const isOwn = currentUserId === reply.userId;

  return (
    <article className={cn("flex gap-3", isOwn && "rounded-xl bg-muted/20 px-2 py-2 -mx-2")}>
      <CommentAvatar email={reply.user.email} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-sm font-medium text-foreground">{formatAuthorLabel(reply.user.email)}</p>
          <time className="text-[11px] text-muted-foreground" dateTime={reply.createdAt}>
            {formatCommentTime(reply.createdAt, language)}
          </time>
        </div>
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-foreground/90">{reply.body}</p>
        {canDelete ? (
          <div className="mt-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-lg px-2 text-xs text-muted-foreground hover:text-destructive"
              disabled={isDeleting}
              onClick={() => onDelete(reply.id)}
            >
              <Trash2 className="mr-1 size-3.5" aria-hidden />
              {deleteLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

type CommentThreadProps = {
  comment: DiscussionComment;
  language: Language;
  currentUserId?: string;
  canParticipate: boolean;
  onReply: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  isDeleting: boolean;
  replyLabel: string;
  deleteLabel: string;
};

function CommentThread({ comment, language, currentUserId, canParticipate, onReply, onDelete, isDeleting, replyLabel, deleteLabel }: CommentThreadProps) {
  const canDelete = Boolean(currentUserId && comment.userId === currentUserId);
  const isOwn = currentUserId === comment.userId;

  return (
    <article className={cn("flex gap-3 py-5 first:pt-0", isOwn && "rounded-xl bg-muted/15 px-3 -mx-3")}>
      <CommentAvatar email={comment.user.email} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-sm font-semibold text-foreground">{formatAuthorLabel(comment.user.email)}</p>
          <time className="text-[11px] text-muted-foreground" dateTime={comment.createdAt}>
            {formatCommentTime(comment.createdAt, language)}
          </time>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{comment.body}</p>
        <CommentActions
          canReply={canParticipate}
          canDelete={canDelete}
          isDeleting={isDeleting}
          onReply={() => onReply(comment.id)}
          onDelete={() => onDelete(comment.id)}
          replyLabel={replyLabel}
          deleteLabel={deleteLabel}
        />

        {comment.replies?.length ? (
          <div className="relative mt-4 space-y-4 border-l-2 border-border/50 pl-4 sm:pl-5">
            {comment.replies.map((reply) => (
              <ReplyRow
                key={reply.id}
                reply={reply}
                language={language}
                currentUserId={currentUserId}
                canDelete={Boolean(currentUserId && reply.userId === currentUserId)}
                isDeleting={isDeleting}
                onDelete={onDelete}
                deleteLabel={deleteLabel}
              />
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function DiscussionSkeleton() {
  return (
    <div className="space-y-5 pt-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex gap-3">
          <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted/50" aria-hidden />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 animate-pulse rounded-md bg-muted/50" aria-hidden />
            <div className="h-3 w-full animate-pulse rounded-md bg-muted/40" aria-hidden />
            <div className="h-3 w-4/5 animate-pulse rounded-md bg-muted/40" aria-hidden />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CourseDiscussionPanel({ courseId, lessonId, currentUserId, currentUserEmail, canParticipate }: CourseDiscussionPanelProps) {
  const { t, formatError, language } = useI18n();
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
    <div className="space-y-6">
      <CommentComposer
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={() => void handleSubmit()}
        onCancelReply={() => setReplyToId(null)}
        isSubmitting={createMutation.isPending}
        canParticipate={canParticipate}
        currentUserEmail={currentUserEmail}
        replyAuthor={replyTarget ? formatAuthorLabel(replyTarget.user.email) : undefined}
        placeholder={t("courseLearn.discussionPlaceholder")}
        postLabel={t("courseLearn.discussionPost")}
        postingLabel={t("courseLearn.discussionPosting")}
        replyingToLabel={t("courseLearn.discussionReplyingTo")}
        cancelReplyLabel={t("courseLearn.discussionCancelReply")}
      />

      {commentsQuery.isLoading ? (
        <DiscussionSkeleton />
      ) : commentsQuery.isError ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {formatError(commentsQuery.error, "errors.unexpected")}
        </p>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border/70 bg-muted/10 px-6 py-10 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-muted/40 text-muted-foreground ring-1 ring-border/60">
            <MessageSquare className="size-5" aria-hidden />
          </span>
          <p className="mt-4 text-sm font-medium text-foreground">{t("courseLearn.discussionEmptyTitle")}</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t("courseLearn.discussionEmpty")}</p>
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              language={language}
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
    </div>
  );
}
