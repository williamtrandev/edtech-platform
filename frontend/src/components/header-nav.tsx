import type { LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
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

  return (
    <nav
      className="flex min-w-0 flex-1 justify-center px-1 sm:px-2"
      aria-label="Main"
    >
      <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted/50 p-1 ring-1 ring-border/80 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = isNavActive(location.pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-md px-3 text-[13px] font-semibold transition-[background-color,color,box-shadow] duration-200 sm:px-3.5 sm:text-sm",
                active
                  ? "bg-card text-foreground shadow-sm ring-1 ring-border/90"
                  : "text-muted-foreground hover:bg-card/75 hover:text-foreground"
              )}
            >
              <Icon className="size-4" aria-hidden />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
