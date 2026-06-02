import { Activity, BarChart3, BookMarked, ClipboardList, Compass, GraduationCap, Library, LogIn, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HeaderNav, type HeaderNavItem } from "./header-nav";
import { HeaderUserMenu } from "./header-user-menu";
import { NotificationCenter } from "./notification-center";
import { USER_ROLE, type UserRole } from "../constants/business";
import { useAuth } from "../hooks/use-auth";
import { LanguageSelect, ThemeSelect } from "../features/preferences/preference-selectors";
import { useCurrentUser } from "../hooks/use-current-user";
import {
  HEADER_BRAND,
  HEADER_BRAND_MARK,
  HEADER_ICON_BUTTON,
  HEADER_INNER,
  HEADER_OFFSET,
  HEADER_PAGE_BAND,
  HEADER_PAGE_INNER,
  HEADER_SHELL,
  HEADER_TOOLBAR
} from "../lib/studio-ui";
import { useI18n } from "../i18n";

const EXPLORE_NAV: HeaderNavItem = { to: "/explore", labelKey: "nav.explore", icon: Compass };
const MY_LEARNING_NAV: HeaderNavItem = { to: "/dashboard", labelKey: "nav.myLearning", icon: Library };
const PROGRESS_NAV: HeaderNavItem = { to: "/my-progress", labelKey: "nav.progress", icon: GraduationCap };
const COURSE_STUDIO_NAV: HeaderNavItem = { to: "/courses", labelKey: "nav.courseStudio", icon: BookMarked, activePath: "/courses" };
const USERS_NAV: HeaderNavItem = { to: "/users", labelKey: "nav.users", icon: Users };
const ANALYTICS_NAV: HeaderNavItem = { to: "/analytics", labelKey: "nav.analytics", icon: BarChart3 };
const AUDIT_NAV: HeaderNavItem = { to: "/audit", labelKey: "nav.audit", icon: ClipboardList };
const JOBS_NAV: HeaderNavItem = { to: "/jobs", labelKey: "nav.jobs", icon: Activity };

const NAV_BY_ROLE: Record<UserRole, HeaderNavItem[]> = {
  [USER_ROLE.user]: [EXPLORE_NAV, MY_LEARNING_NAV, PROGRESS_NAV],
  [USER_ROLE.instructor]: [EXPLORE_NAV, COURSE_STUDIO_NAV],
  [USER_ROLE.admin]: [COURSE_STUDIO_NAV, USERS_NAV, ANALYTICS_NAV, AUDIT_NAV, JOBS_NAV]
};

const GUEST_NAV: HeaderNavItem[] = [EXPLORE_NAV];

function getNavItemsForRole(role: UserRole | undefined, isAuthenticated: boolean): HeaderNavItem[] {
  if (!isAuthenticated || !role) {
    return GUEST_NAV;
  }

  return NAV_BY_ROLE[role] ?? GUEST_NAV;
}


type DashboardLayoutProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  immersive?: boolean;
};

export function DashboardLayout({ title, subtitle, actions, children, immersive = false }: DashboardLayoutProps) {
  const { userEmail, isAuthenticated, isBootstrapping } = useAuth();
  const meQuery = useCurrentUser(isAuthenticated && !isBootstrapping);
  const { t } = useI18n();

  const visibleNav = useMemo(
    () => getNavItemsForRole(meQuery.data?.role, isAuthenticated),
    [isAuthenticated, meQuery.data?.role]
  );

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-50 -translate-y-16 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-transform focus:translate-y-0"
      >
        {t("common.skipToContent")}
      </a>
      <header className={HEADER_SHELL}>
        <div className={HEADER_INNER}>
          <Link
            to={isAuthenticated ? (visibleNav[0]?.to ?? "/explore") : "/explore"}
            className={HEADER_BRAND}
          >
            <span className={HEADER_BRAND_MARK}>E</span>
            <span className="hidden max-w-[9rem] truncate text-sm font-semibold tracking-tight text-foreground sm:inline lg:max-w-none">
              {t("app.name")}
            </span>
          </Link>

          <HeaderNav items={visibleNav} />

          <div className={HEADER_TOOLBAR}>
            {isAuthenticated ? (
              <>
                <NotificationCenter enabled={isAuthenticated && !isBootstrapping} align="right" buttonClassName={HEADER_ICON_BUTTON} />
                <ThemeSelect variant="icon" className={HEADER_ICON_BUTTON} />
                <LanguageSelect variant="icon" className={HEADER_ICON_BUTTON} />
                <span className="mx-0.5 hidden h-5 w-px bg-border/70 sm:block" aria-hidden />
                <HeaderUserMenu email={userEmail} role={meQuery.data?.role} />
              </>
            ) : (
              <>
                <ThemeSelect variant="icon" className={HEADER_ICON_BUTTON} />
                <LanguageSelect variant="icon" className={HEADER_ICON_BUTTON} />
                <Button asChild size="sm" className="ml-0.5 h-9 rounded-full px-4 shadow-none">
                  <Link to="/login" className="cursor-pointer">
                    <LogIn className="mr-1.5 size-4" aria-hidden />
                    <span className="hidden sm:inline">{t("auth.footer.signIn")}</span>
                    <span className="sr-only sm:hidden">{t("auth.footer.signIn")}</span>
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className={cn("flex min-h-dvh flex-col", HEADER_OFFSET)}>
        {!immersive ? (
          <div className={HEADER_PAGE_BAND}>
            <div className={HEADER_PAGE_INNER}>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-2xl">{title}</h1>
                {subtitle ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p> : null}
              </div>
              {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
            </div>
          </div>
        ) : null}

        <main
          id="main-content"
          className={cn(
            "mx-auto min-h-0 w-full flex-1",
            immersive ? "max-w-none px-0 py-0" : "max-w-[1600px] px-4 py-6 sm:px-5 lg:px-8"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
