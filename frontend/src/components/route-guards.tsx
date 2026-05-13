import { Navigate, Outlet } from "react-router-dom";
import { Skeleton } from "./skeleton";
import { USER_ROLE } from "../constants/business";
import { useAuth } from "../features/auth/auth-context";
import { useCurrentUser } from "../features/user/hooks/use-current-user";

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/30 via-background to-background px-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-sm font-bold text-background">E</span>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Preparing your workspace…</p>
    </div>
  );
}

export function RequireAuth() {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function PublicOnly() {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <FullScreenLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

/** After login: learners land on Explore; instructors and admins on Course studio. */
export function HomeRedirect() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const me = useCurrentUser(isAuthenticated && !isBootstrapping);

  if (isBootstrapping || (isAuthenticated && me.isLoading)) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/explore" replace />;
  }

  if (me.isError) {
    return <Navigate to="/explore" replace />;
  }

  const canAccessWorkspace = me.data?.role === USER_ROLE.instructor || me.data?.role === USER_ROLE.admin;
  if (!canAccessWorkspace) {
    return <Navigate to="/explore" replace />;
  }

  return <Navigate to="/courses" replace />;
}

/** Instructor workspace: list + create courses — not for plain students. */
export function CoursesWorkspaceGate() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const me = useCurrentUser(isAuthenticated && !isBootstrapping);

  if (isBootstrapping || (isAuthenticated && me.isLoading)) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (me.data?.role === USER_ROLE.user) {
    return <Navigate to="/explore" replace />;
  }

  return <Outlet />;
}

export function AdminUsersGate() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const me = useCurrentUser(isAuthenticated && !isBootstrapping);

  if (isBootstrapping || (isAuthenticated && me.isLoading)) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (me.data?.role !== USER_ROLE.admin) {
    return <Navigate to="/explore" replace />;
  }

  return <Outlet />;
}
