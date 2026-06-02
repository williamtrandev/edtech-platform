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

/** App shell header — shared across dashboard layout and auth surfaces */
export const HEADER_HEIGHT = "h-14";
export const HEADER_OFFSET = "pt-14 lg:pt-[4.25rem]";
export const HEADER_SHELL =
  "fixed inset-x-0 top-0 z-40 border-b border-border/70 bg-background/85 shadow-[0_1px_0_0_var(--border)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/72 lg:border-b-0 lg:bg-transparent lg:px-4 lg:pt-2.5 lg:shadow-none lg:supports-[backdrop-filter]:bg-transparent xl:px-6";
export const HEADER_INNER =
  "mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:rounded-2xl lg:border lg:border-border/70 lg:bg-background/88 lg:px-4 lg:shadow-[0_10px_40px_-12px_rgb(0_0_0/0.12)] lg:backdrop-blur-xl lg:supports-[backdrop-filter]:bg-background/75 xl:px-5";
export const HEADER_PAGE_BAND = "shrink-0 border-b border-border/60 bg-background/50 backdrop-blur-sm";
export const HEADER_PAGE_INNER =
  "mx-auto flex max-w-[1600px] flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5 lg:px-8";
export const HEADER_BRAND =
  "group flex shrink-0 cursor-pointer items-center gap-2.5 rounded-xl py-1 pr-2 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";
export const HEADER_BRAND_MARK =
  "flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-sm ring-1 ring-primary/20 transition-transform group-hover:scale-[1.02]";
export const HEADER_TOOLBAR =
  "flex shrink-0 items-center gap-0.5 rounded-full bg-muted/45 p-0.5 ring-1 ring-foreground/10 sm:gap-1 sm:p-1";
export const HEADER_ICON_BUTTON =
  "size-9 shrink-0 rounded-full border-0 bg-transparent shadow-none hover:bg-background/80 hover:text-foreground";
export const HEADER_NAV_BAR =
  "inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full bg-muted/45 p-1 ring-1 ring-foreground/10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
export const HEADER_NAV_LINK =
  "relative inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-full px-3 text-[13px] font-medium transition-[background-color,color,box-shadow] duration-200 sm:h-9 sm:px-3.5 sm:text-sm";
export const HEADER_NAV_LINK_ACTIVE =
  "bg-background text-foreground shadow-sm ring-1 ring-foreground/10 after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-full after:bg-primary sm:after:inset-x-4";
export const HEADER_NAV_LINK_IDLE = "text-muted-foreground hover:bg-background/70 hover:text-foreground";
