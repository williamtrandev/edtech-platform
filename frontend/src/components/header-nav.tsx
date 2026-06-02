import { useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  HEADER_ICON_BUTTON,
  HEADER_NAV_BAR,
  HEADER_NAV_LINK,
  HEADER_NAV_LINK_ACTIVE,
  HEADER_NAV_LINK_IDLE
} from "../lib/studio-ui";
import { type I18nKey, useI18n } from "../i18n";

export type HeaderNavItem = {
  to: string;
  labelKey: I18nKey;
  icon: LucideIcon;
  activePath?: string;
};

function isNavActive(pathname: string, item: HeaderNavItem): boolean {
  if (item.activePath) {
    return pathname === item.activePath || pathname.startsWith(`${item.activePath}/`);
  }
  if (pathname === item.to) {
    return true;
  }
  return pathname.startsWith(`${item.to}/`);
}

type HeaderNavProps = {
  items: HeaderNavItem[];
};

export function HeaderNav({ items }: HeaderNavProps) {
  const location = useLocation();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const renderLink = (item: HeaderNavItem, compact: boolean) => {
    const active = isNavActive(location.pathname, item);
    const Icon = item.icon;
    const label = t(item.labelKey);

    return (
      <Link
        key={item.to}
        to={item.to}
        aria-current={active ? "page" : undefined}
        title={label}
        onClick={() => setMobileOpen(false)}
        className={cn(
          HEADER_NAV_LINK,
          compact ? "h-10 w-full justify-start px-3.5 sm:h-11" : "",
          active ? HEADER_NAV_LINK_ACTIVE : HEADER_NAV_LINK_IDLE
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className={compact ? "inline" : "hidden md:inline"}>{label}</span>
        {compact ? null : <span className="sr-only md:hidden">{label}</span>}
      </Link>
    );
  };

  const toggleMobileMenu = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setMobileOpen((open) => !open);
  };

  return (
    <>
      <nav className="hidden min-w-0 flex-1 justify-center px-0.5 md:flex sm:px-2" aria-label={t("common.mainNavigation")}>
        <div className={HEADER_NAV_BAR}>{items.map((item) => renderLink(item, false))}</div>
      </nav>

      <div className="relative flex min-w-0 flex-1 justify-end md:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={HEADER_ICON_BUTTON}
          aria-expanded={mobileOpen}
          aria-controls="header-mobile-nav"
          aria-label={mobileOpen ? t("common.closeMenu") : t("common.openMenu")}
          onClick={toggleMobileMenu}
        >
          {mobileOpen ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
        </Button>

        {mobileOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 top-14 z-30 bg-background/40 backdrop-blur-[2px]"
              aria-label={t("common.closeMenu")}
              onClick={() => setMobileOpen(false)}
            />
            <nav
              id="header-mobile-nav"
              aria-label={t("common.mainNavigation")}
              className="absolute right-0 top-[calc(100%+0.35rem)] z-40 w-[min(100vw-1.5rem,18rem)] rounded-2xl border border-border/70 bg-background/95 p-2 shadow-lg backdrop-blur-xl"
            >
              <div className="flex flex-col gap-0.5">{items.map((item) => renderLink(item, true))}</div>
            </nav>
          </>
        ) : null}
      </div>
    </>
  );
}
