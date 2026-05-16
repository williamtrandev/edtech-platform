import { BookMarked, Compass, GraduationCap, Library, LogIn, LogOut, Settings, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { USER_ROLE } from "../constants/business";
import { useAuth } from "../features/auth/auth-context";
import { LanguageSelect, ThemeSelect } from "../features/preferences/preference-selectors";
import { useCurrentUser } from "../features/user/hooks/use-current-user";
import { type I18nKey, useI18n } from "../i18n";

type NavItem = {
  to: string;
  labelKey: I18nKey;
  icon: LucideIcon;
  /** If set, only these roles see the item */
  roles?: readonly string[];
  /** Active when pathname equals `to` (default) or when `activePath` matches */
  activePath?: string;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/explore", labelKey: "nav.explore", icon: Compass },
  { to: "/dashboard", labelKey: "nav.myLearning", icon: Library, roles: [USER_ROLE.user, USER_ROLE.instructor, USER_ROLE.admin] },
  { to: "/courses", labelKey: "nav.courseStudio", icon: BookMarked, roles: [USER_ROLE.instructor, USER_ROLE.admin], activePath: "/courses" },
  { to: "/my-progress", labelKey: "nav.progress", icon: GraduationCap, roles: [USER_ROLE.user, USER_ROLE.instructor, USER_ROLE.admin] },
  { to: "/users", labelKey: "nav.users", icon: Users, roles: [USER_ROLE.admin] },
  { to: "/settings", labelKey: "nav.settings", icon: Settings, roles: [USER_ROLE.user, USER_ROLE.instructor, USER_ROLE.admin] }
];

function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.activePath) {
    return pathname === item.activePath;
  }
  if (pathname === item.to) {
    return true;
  }
  return pathname.startsWith(`${item.to}/`);
}

type DashboardLayoutProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function DashboardLayout({ title, subtitle, actions, children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { userEmail, signOut, isAuthenticated, isBootstrapping } = useAuth();
  const meQuery = useCurrentUser(isAuthenticated && !isBootstrapping);
  const { t } = useI18n();

  const visibleNav = useMemo(() => {
    const role = meQuery.data?.role;
    if (!role) {
      return NAV_ITEMS.filter((item) => !item.roles);
    }
    return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
  }, [meQuery.data?.role]);

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-background">
      <aside className="relative hidden h-dvh w-64 shrink-0 flex-col overflow-hidden border-r border-border/60 bg-card/40 backdrop-blur-xl lg:flex">
        <div className="flex h-14 shrink-0 items-center border-b border-border/60 px-5">
          <Link to="/" className="flex cursor-pointer items-center gap-2 font-semibold tracking-tight transition-opacity hover:opacity-90">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-xs font-bold text-background">
              E
            </span>
            <span className="text-sm">EdTech</span>
          </Link>
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain p-3" aria-label="Main">
          {visibleNav.map((item) => {
            const active = isNavActive(location.pathname, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 border-t border-border/60 p-3">
          {isAuthenticated ? (
            <div className="mb-3 grid gap-2 rounded-xl border border-border/60 bg-background/60 p-3">
              <div className="grid gap-1">
                <label id="sidebar-theme-select-label" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("settings.themeLabel")}
                </label>
                <ThemeSelect labelId="sidebar-theme-select-label" />
              </div>
              <div className="grid gap-1">
                <label id="sidebar-language-select-label" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("settings.languageLabel")}
                </label>
                <LanguageSelect labelId="sidebar-language-select-label" />
              </div>
            </div>
          ) : null}
          {isAuthenticated ? (
            <>
              <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-2.5">
                <p className="truncate text-xs font-medium text-foreground">{userEmail ?? "Signed in"}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">{t("common.role")}</span>
                  {meQuery.data?.role ? (
                    <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px] font-medium uppercase tracking-wide">
                      {t(`role.${meQuery.data.role}` as I18nKey)}
                    </Badge>
                  ) : meQuery.isLoading ? (
                    <span className="text-[11px] text-muted-foreground">…</span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">—</span>
                  )}
                </div>
              </div>
              <Button
                className="mt-2 w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                variant="ghost"
                size="sm"
                type="button"
                onClick={async () => {
                  await signOut();
                  navigate("/login", { replace: true });
                }}
              >
                <LogOut className="size-4" />
                {t("common.signOut")}
              </Button>
            </>
          ) : (
            <Button asChild className="w-full justify-start gap-2 rounded-xl" size="sm">
              <Link to="/login" className="cursor-pointer">
                <LogIn className="size-4" />
                {t("auth.footer.signIn")}
              </Link>
            </Button>
          )}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 shrink-0 border-b border-border/60 bg-background/85 backdrop-blur-md lg:hidden">
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <Link to="/" className="cursor-pointer text-sm font-semibold tracking-tight">
              EdTech
            </Link>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              {isAuthenticated ? (
                <div className="hidden items-center gap-2 sm:flex">
                  <ThemeSelect />
                  <LanguageSelect />
                </div>
              ) : null}
              <nav className="flex min-w-0 justify-end gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {visibleNav.map((item) => {
                  const active = isNavActive(location.pathname, item);
                  return (
                    <Button key={item.to} asChild size="sm" variant={active ? "default" : "ghost"} className="shrink-0 rounded-full">
                      <Link to={item.to} className="cursor-pointer">{t(item.labelKey)}</Link>
                    </Button>
                  );
                })}
              </nav>
            </div>
          </div>
          {isAuthenticated ? (
            <div className="grid grid-cols-2 gap-2 border-t border-border/40 px-4 py-2 sm:hidden">
              <ThemeSelect />
              <LanguageSelect />
            </div>
          ) : null}
        </header>

        <div className="shrink-0 border-b border-border/40 bg-muted/20">
          <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <span>{t("common.app")}</span>
                <span className="text-foreground/60" aria-hidden>
                  /
                </span>
                <span className="truncate text-foreground/80">{title}</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
              {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
          </div>
        </div>

        <main className="mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-y-auto overscroll-y-contain px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
