'use client';

import { useState } from 'react';

const TABS = ['Profile', 'Products', 'Intelligence'] as const;
export type TabId = (typeof TABS)[number];

type Props = {
  defaultTab?: TabId;
  children: (activeTab: TabId) => React.ReactNode;
};

export function MyCompanyTabs({ defaultTab = 'Profile', children }: Props) {
  const [active, setActive] = useState<TabId>(defaultTab);

  return (
    <div>
      <nav className="flex gap-1 border-b border-border mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              active === tab
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground/80'
            }`}
          >
            {tab}
            {active === tab && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </nav>
      {children(active)}
    </div>
  );
}
