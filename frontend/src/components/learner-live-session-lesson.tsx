import { CalendarDays, ExternalLink, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LessonContentPayload } from "../lib/lesson-content";

type LearnerLiveSessionLessonProps = {
  content: LessonContentPayload;
  joinSessionLabel: string;
  scheduledLabel: string;
  instructionsLabel: string;
  noDetailsLabel: string;
};

export function LearnerLiveSessionLesson({
  content,
  joinSessionLabel,
  scheduledLabel,
  instructionsLabel,
  noDetailsLabel
}: LearnerLiveSessionLessonProps) {
  const startsAt = content.startsAt ? new Date(content.startsAt) : null;
  const hasValidStart = startsAt && !Number.isNaN(startsAt.getTime());
  const meetingUrl = content.meetingUrl?.trim();
  const instructions = content.instructions?.trim();

  if (!meetingUrl && !instructions) {
    return <p className="text-sm text-muted-foreground">{noDetailsLabel}</p>;
  }

  return (
    <div className="grid gap-4">
      {hasValidStart ? (
        <div className="flex items-start gap-3 rounded-xl bg-muted/30 px-4 py-3 ring-1 ring-foreground/10">
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{scheduledLabel}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {startsAt.toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short"
              })}
            </p>
          </div>
        </div>
      ) : null}

      {meetingUrl ? (
        <div className="flex flex-col gap-3 rounded-xl bg-muted/30 px-4 py-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <Video className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{joinSessionLabel}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{meetingUrl}</p>
            </div>
          </div>
          <Button asChild className="h-10 shrink-0 rounded-md shadow-none">
            <a href={meetingUrl} rel="noreferrer" target="_blank">
              <ExternalLink className="size-4" aria-hidden />
              {joinSessionLabel}
            </a>
          </Button>
        </div>
      ) : null}

      {instructions ? (
        <div className="rounded-xl bg-muted/20 px-4 py-4 ring-1 ring-foreground/10">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px] font-medium">
              {instructionsLabel}
            </Badge>
          </div>
          <p className={cn("text-sm leading-7 text-foreground whitespace-pre-wrap")}>{instructions}</p>
        </div>
      ) : null}
    </div>
  );
}
