import { BookOpen, ChevronRight, GraduationCap, LogOut, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "../features/auth/auth-context";

const mainNav = [
  { to: "/courses", label: "Courses", icon: BookOpen },
  { to: "/my-progress", label: "Progress", icon: GraduationCap },
  { to: "/users", label: "Users", icon: Users }
] as const;

type DashboardLayoutProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function DashboardLayout({ title, subtitle, actions, children }: DashboardLayoutProps) {
  const location = useLocation();
  const { userEmail, signOut } = useAuth();

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-background">
      {/* Desktop sidebar — locked to viewport height; nav scrolls if needed */}
      <aside className="relative hidden h-dvh w-64 shrink-0 flex-col overflow-hidden border-r border-border/60 bg-card/40 backdrop-blur-xl lg:flex">
        <div className="flex h-14 shrink-0 items-center border-b border-border/60 px-5">
          <Link to="/courses" className="flex items-center gap-2 font-semibold tracking-tight transition-opacity hover:opacity-90">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-xs font-bold text-background">
              E
            </span>
            <span className="text-sm">EdTech</span>
          </Link>
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain p-3" aria-label="Main">
          {mainNav.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 border-t border-border/60 p-3">
          <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-2.5">
            <p className="truncate text-xs font-medium text-foreground">{userEmail ?? "Signed in"}</p>
            <p className="text-[11px] text-muted-foreground">Workspace</p>
          </div>
          <Button
            className="mt-2 w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => {
              void signOut();
            }}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main column — fills remaining width; only this column scrolls vertically */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile / tablet top nav */}
        <header className="sticky top-0 z-30 shrink-0 border-b border-border/60 bg-background/85 backdrop-blur-md lg:hidden">
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <Link to="/courses" className="text-sm font-semibold tracking-tight">
              EdTech
            </Link>
            <nav className="flex min-w-0 flex-1 justify-end gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {mainNav.map((item) => {
                const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                return (
                  <Button key={item.to} asChild size="sm" variant={active ? "default" : "ghost"} className="shrink-0 rounded-full">
                    <Link to={item.to}>{item.label}</Link>
                  </Button>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Page chrome */}
        <div className="shrink-0 border-b border-border/40 bg-muted/20">
          <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <span>App</span>
                <ChevronRight className="size-3 opacity-60" aria-hidden />
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
