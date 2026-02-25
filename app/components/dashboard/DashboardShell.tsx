import { ReactNode } from 'react';

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
    <div className="min-h-screen bg-zinc-900 text-slate-100">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(248 250 252) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(248 250 252) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />
      <div className="relative">
        <header className="sticky top-0 z-10 border-b border-slate-700 bg-zinc-900">
          {statusBar}
        </header>
        <main>{children}</main>
        <footer className="border-t border-slate-700">{activityFeed}</footer>
      </div>
    </div>
  );
}
