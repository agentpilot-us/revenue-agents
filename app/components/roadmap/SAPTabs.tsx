'use client';

import { useState, useEffect, type ReactNode } from 'react';

const TABS = [
  { id: 'plays', label: 'Plays' },
  { id: 'intelligence', label: 'Account Intelligence' },
  { id: 'config', label: 'Configuration' },
] as const;

type TabId = (typeof TABS)[number]['id'];

type Props = {
  intelligenceContent: ReactNode;
  playsContent: ReactNode;
  configContent: ReactNode;
  initialTab?: TabId;
};

export default function SAPTabs({ intelligenceContent, playsContent, configContent, initialTab }: Props) {
  const [active, setActive] = useState<TabId>(initialTab ?? 'plays');

  useEffect(() => {
    if (initialTab) setActive(initialTab);
  }, [initialTab]);

  return (
    <div>
      <div className="flex gap-1 border-b border-border mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              active === tab.id
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground/80'
            }`}
          >
            {tab.label}
            {active === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
            )}
          </button>
        ))}
      </div>

      {active === 'intelligence' && intelligenceContent}
      {active === 'plays' && playsContent}
      {active === 'config' && configContent}
    </div>
  );
}
