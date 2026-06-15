import { Terminal } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toMediaUrl } from "../lib/media-url";

const GRID_BG = {
  backgroundImage:
    "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
  backgroundSize: "22px 22px"
} as const;

/** Course title → terminal-style filename, e.g. "Intro to Go" -> "intro-to-go". */
export function toCourseFileSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return slug || "course";
}

type CourseTerminalCoverProps = {
  title: string;
  label: string;
  /** Optional real cover image; rendered inside the window frame when present. */
  imageUrl?: string | null;
  className?: string;
  children?: ReactNode;
};

/**
 * Terminal "file" cover for course cards — window chrome + mono filename. Shows
 * the real cover image inside the frame when one exists, otherwise falls back to
 * a grid/prompt motif so the catalog always matches the landing CodeWindow look.
 */
export function CourseTerminalCover({ title, label, imageUrl, className, children }: CourseTerminalCoverProps) {
  return (
    <div className={cn("relative overflow-hidden border-b border-border bg-card", className)}>
      <div className="flex items-center gap-1.5 border-b border-border/70 bg-secondary/50 px-3 py-2">
        <span className="size-2.5 rounded-full bg-destructive/70" aria-hidden />
        <span className="size-2.5 rounded-full bg-chart-3/70" aria-hidden />
        <span className="size-2.5 rounded-full bg-primary/70" aria-hidden />
        <span className="ml-1.5 truncate font-mono text-[11px] text-muted-foreground">{toCourseFileSlug(title)}.md</span>
      </div>
      <div className="relative aspect-[16/9] overflow-hidden">
        {imageUrl ? (
          <>
            <img
              src={toMediaUrl(imageUrl)}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-background/80 px-2 py-0.5 font-mono text-[11px] text-primary backdrop-blur-sm">
              <Terminal className="size-3" aria-hidden />
              {label}
            </span>
          </>
        ) : (
          <div className="grid h-full place-items-center">
            <div className="pointer-events-none absolute inset-0 text-foreground opacity-[0.05]" style={GRID_BG} />
            <div className="pointer-events-none absolute left-1/2 top-1/3 h-28 w-44 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
            <span className="inline-flex items-center gap-2 font-mono text-sm text-primary transition-transform duration-500 group-hover:scale-105">
              <Terminal className="size-4" aria-hidden />
              {label}
            </span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
