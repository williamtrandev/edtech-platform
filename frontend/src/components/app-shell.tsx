import type { ReactNode } from "react";
import { DashboardLayout } from "./dashboard-layout";

type AppShellProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  immersive?: boolean;
};

export function AppShell({ title, subtitle, actions, children, immersive }: AppShellProps) {
  return (
    <DashboardLayout title={title} subtitle={subtitle} actions={actions} immersive={immersive}>
      {children}
    </DashboardLayout>
  );
}
