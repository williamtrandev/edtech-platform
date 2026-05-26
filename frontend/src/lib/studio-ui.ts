/**
 * Studio UI tokens — match shadcn Card (ring-foreground/10, rounded-xl).
 * Avoid ad-hoc border-border/60|70 and inverted fg/bg selection states.
 */

export const STUDIO_CARD_HEADER = "border-b border-border";

export const STUDIO_TAB_BAR = "flex gap-1 overflow-x-auto rounded-xl bg-muted/50 p-1 ring-1 ring-foreground/10";
export const STUDIO_TAB =
  "inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors";
export const STUDIO_TAB_ACTIVE = "bg-background text-foreground shadow-sm ring-1 ring-foreground/10";
export const STUDIO_TAB_IDLE = "text-muted-foreground hover:bg-background/70 hover:text-foreground";
export const STUDIO_TAB_COUNT_ACTIVE = "rounded-md bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-foreground";
export const STUDIO_TAB_COUNT_IDLE = "rounded-md bg-background/80 px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground";

export const STUDIO_LIST = "rounded-xl bg-muted/40 p-1.5 ring-1 ring-foreground/10";
export const STUDIO_LIST_ITEM =
  "flex items-start gap-2 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-background/80";
export const STUDIO_LIST_ITEM_SELECTED = "bg-background shadow-sm ring-1 ring-foreground/15";

export const STUDIO_ROW =
  "rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 transition-colors hover:bg-accent/40";
export const STUDIO_ROW_SELECTED = "bg-accent/70 ring-foreground/20";

export const STUDIO_CHOICE =
  "flex cursor-pointer items-start gap-3 rounded-lg bg-background px-3 py-3 text-left ring-1 ring-foreground/10 transition-colors hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-60";
export const STUDIO_CHOICE_ACTIVE = "bg-background text-foreground shadow-sm ring-2 ring-foreground/20";

export const STUDIO_PANEL = "rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/10";
export const STUDIO_FORM_SHELL = "rounded-xl bg-muted/30 p-5 ring-1 ring-foreground/10 md:p-6";
export const STUDIO_NOTICE = "rounded-xl bg-muted/50 px-4 py-3.5 ring-1 ring-foreground/10";
export const STUDIO_STAT = "rounded-xl bg-muted/40 px-3 py-3 ring-1 ring-foreground/10";

export const STUDIO_DIVIDER = "border-t border-border";
export const STUDIO_EMPTY = "rounded-xl bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground ring-1 ring-foreground/10";

export const STUDIO_ICON_BADGE = "grid size-9 shrink-0 place-items-center rounded-lg bg-background text-muted-foreground ring-1 ring-foreground/10";

export const STUDIO_EDITOR_TITLE = "text-lg font-semibold tracking-tight";
