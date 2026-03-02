import { ReactNode } from 'react';
import { dash } from '@/app/dashboard/dashboard-classes';

type ThreeColumnLayoutProps = {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
};

export function ThreeColumnLayout({ left, center, right }: ThreeColumnLayoutProps) {
  return (
    <div className={dash.gridContainer}>
      <div className={dash.gridLayout}>
        {/* Left: Hot Signals + NBAs + Tasks */}
        <aside className={dash.gridLeft}>
          {left}
        </aside>

        {/* Center: Account Radar + Division Cards */}
        <section className={dash.gridCenter}>
          {center}
        </section>

        {/* Right: This Week + Pipeline + Launch */}
        <aside className={dash.gridRight}>
          {right}
        </aside>
      </div>
    </div>
  );
}
