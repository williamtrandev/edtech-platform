import { ChevronDown, LogOut, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { UserRole } from "../constants/business";
import { useAuth } from "../hooks/use-auth";
import { type I18nKey, useI18n } from "../i18n";

type HeaderUserMenuProps = {
  email?: string | null;
  role?: UserRole;
};

function getInitials(email: string): string {
  const localPart = email.split("@")[0] ?? email;
  const segments = localPart.split(/[._-]+/).filter(Boolean);

  if (segments.length >= 2) {
    return `${segments[0]?.[0] ?? ""}${segments[1]?.[0] ?? ""}`.toUpperCase();
  }

  return localPart.slice(0, 2).toUpperCase();
}

export function HeaderUserMenu({ email, role }: HeaderUserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { t } = useI18n();

  const displayEmail = email?.trim() || t("common.signedIn");
  const initials = email ? getInitials(email) : "?";

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "inline-flex h-9 max-w-[12rem] cursor-pointer items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors",
          "hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          open && "bg-muted/70"
        )}
        onClick={() => setOpen((value) => !value)}
      >
        <span
          aria-hidden
          className="grid size-7 shrink-0 place-items-center rounded-full bg-foreground text-[11px] font-semibold tracking-tight text-background"
        >
          {initials}
        </span>
        <span className="hidden min-w-0 flex-col items-start leading-none lg:flex">
          <span className="max-w-[8.5rem] truncate text-xs font-medium text-foreground">{displayEmail}</span>
          {role ? (
            <span className="mt-0.5 truncate text-[10px] text-muted-foreground">{t(`role.${role}` as I18nKey)}</span>
          ) : null}
        </span>
        <ChevronDown
          className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border/70 bg-popover p-1.5 shadow-lg"
        >
          <div className="rounded-lg bg-muted/40 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-foreground">{displayEmail}</p>
            {role ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{t(`role.${role}` as I18nKey)}</p>
            ) : null}
          </div>

          <div className="mt-1 grid gap-0.5">
            <Link
              to="/settings"
              role="menuitem"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/70"
              onClick={() => setOpen(false)}
            >
              <Settings className="size-4 text-muted-foreground" aria-hidden />
              {t("nav.settings")}
            </Link>
            <button
              type="button"
              role="menuitem"
              className="inline-flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
              onClick={async () => {
                setOpen(false);
                await signOut();
                navigate("/login", { replace: true });
              }}
            >
              <LogOut className="size-4" aria-hidden />
              {t("common.signOut")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
