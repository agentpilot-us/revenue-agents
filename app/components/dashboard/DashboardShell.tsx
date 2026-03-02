import { ReactNode } from 'react';
import { dash } from '@/app/dashboard/dashboard-classes';

type DashboardShellProps = {
  statusBar: ReactNode;
  children: ReactNode;
  activityFeed: ReactNode;
};

export function DashboardShell({
  statusBar,
  children,
  activityFeed,
}: DashboardShellProps) {
  return (
    <div className={dash.page}>
      {/* Subtle grid texture for depth */}
      <div
        className={dash.gridOverlay}
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative">
        <header className={dash.header}>
          {statusBar}
        </header>

        <main>{children}</main>

        <footer className={dash.activityFeed}>
          {activityFeed}
        </footer>
      </div>
    </div>
  );
}
