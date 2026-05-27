import { Activity, BookMarked, ClipboardList, Compass, GraduationCap, Library, LogIn, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HeaderNav, type HeaderNavItem } from "./header-nav";
import { HeaderUserMenu } from "./header-user-menu";
import { NotificationCenter } from "./notification-center";
import { USER_ROLE, type UserRole } from "../constants/business";
import { useAuth } from "../hooks/use-auth";
import { LanguageSelect, ThemeSelect } from "../features/preferences/preference-selectors";
import { useCurrentUser } from "../hooks/use-current-user";
import { useI18n } from "../i18n";

const EXPLORE_NAV: HeaderNavItem = { to: "/explore", labelKey: "nav.explore", icon: Compass };
const MY_LEARNING_NAV: HeaderNavItem = { to: "/dashboard", labelKey: "nav.myLearning", icon: Library };
const PROGRESS_NAV: HeaderNavItem = { to: "/my-progress", labelKey: "nav.progress", icon: GraduationCap };
const COURSE_STUDIO_NAV: HeaderNavItem = { to: "/courses", labelKey: "nav.courseStudio", icon: BookMarked, activePath: "/courses" };
const USERS_NAV: HeaderNavItem = { to: "/users", labelKey: "nav.users", icon: Users };
const AUDIT_NAV: HeaderNavItem = { to: "/audit", labelKey: "nav.audit", icon: ClipboardList };
const JOBS_NAV: HeaderNavItem = { to: "/jobs", labelKey: "nav.jobs", icon: Activity };

const NAV_BY_ROLE: Record<UserRole, HeaderNavItem[]> = {
  [USER_ROLE.user]: [EXPLORE_NAV, MY_LEARNING_NAV, PROGRESS_NAV],
  [USER_ROLE.instructor]: [EXPLORE_NAV, COURSE_STUDIO_NAV],
  [USER_ROLE.admin]: [COURSE_STUDIO_NAV, USERS_NAV, AUDIT_NAV, JOBS_NAV]
};

const GUEST_NAV: HeaderNavItem[] = [EXPLORE_NAV];

function getNavItemsForRole(role: UserRole | undefined, isAuthenticated: boolean): HeaderNavItem[] {
  if (!isAuthenticated || !role) {
    return GUEST_NAV;
  }

  return NAV_BY_ROLE[role] ?? GUEST_NAV;
}

const HEADER_ICON_BUTTON = "border-0 bg-transparent shadow-none hover:bg-muted/70";

type DashboardLayoutProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function DashboardLayout({ title, subtitle, actions, children }: DashboardLayoutProps) {
  const { userEmail, isAuthenticated, isBootstrapping } = useAuth();
  const meQuery = useCurrentUser(isAuthenticated && !isBootstrapping);
  const { t } = useI18n();

  const visibleNav = useMemo(
    () => getNavItemsForRole(meQuery.data?.role, isAuthenticated),
    [isAuthenticated, meQuery.data?.role]
  );

  return (
    <div className="min-h-dvh bg-background">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:gap-4 sm:px-5 lg:px-8">
          <Link
            to={isAuthenticated ? (visibleNav[0]?.to ?? "/explore") : "/explore"}
            className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg py-1 pr-2 transition-opacity hover:opacity-90"
          >
            <span className="flex size-8 items-center justify-center rounded-xl bg-foreground text-xs font-bold text-background">E</span>
            <span className="hidden max-w-[9rem] truncate text-sm font-semibold tracking-tight text-foreground sm:inline lg:max-w-none">
              {t("app.name")}
            </span>
          </Link>

          <HeaderNav items={visibleNav} />

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            {isAuthenticated ? (
              <>
                <NotificationCenter enabled={isAuthenticated && !isBootstrapping} align="right" buttonClassName={HEADER_ICON_BUTTON} />
                <ThemeSelect variant="icon" className={HEADER_ICON_BUTTON} />
                <LanguageSelect variant="icon" className={HEADER_ICON_BUTTON} />
                <span className="mx-0.5 hidden h-5 w-px bg-border/80 sm:block" aria-hidden />
                <HeaderUserMenu email={userEmail} role={meQuery.data?.role} />
              </>
            ) : (
              <>
                <ThemeSelect variant="icon" className={HEADER_ICON_BUTTON} />
                <LanguageSelect variant="icon" className={HEADER_ICON_BUTTON} />
                <Button asChild size="sm" className="ml-1 h-9 rounded-full px-4 shadow-none">
                  <Link to="/login" className="cursor-pointer">
                    <LogIn className="mr-1.5 size-4" aria-hidden />
                    {t("auth.footer.signIn")}
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-dvh flex-col pt-16">
        <div className="shrink-0 border-b border-border bg-muted/20">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-start justify-between gap-4 px-4 py-5 sm:px-5 lg:px-8">
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

        <main className="mx-auto min-h-0 w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-5 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
