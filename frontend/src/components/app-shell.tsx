import type { ReactNode } from "react";
import { DashboardLayout } from "./dashboard-layout";

type AppShellProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  return (
    <DashboardLayout title={title} subtitle={subtitle} actions={actions}>
      {children}
    </DashboardLayout>
  );
}
