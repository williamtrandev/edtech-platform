import { Navigate, Outlet } from "react-router-dom";
import { Skeleton } from "./skeleton";
import { useAuth } from "../features/auth/auth-context";

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
    return <Navigate to="/courses" replace />;
  }

  return <Outlet />;
}
