'use client';

import { useState, type ReactNode } from 'react';

const TABS = [
  { id: 'intelligence', label: 'Account Intelligence' },
  { id: 'plays', label: 'Approved Plays' },
  { id: 'config', label: 'Configuration' },
] as const;

type TabId = (typeof TABS)[number]['id'];

type Props = {
  intelligenceContent: ReactNode;
  playsContent: ReactNode;
  configContent: ReactNode;
};

export default function SAPTabs({ intelligenceContent, playsContent, configContent }: Props) {
  const [active, setActive] = useState<TabId>('intelligence');

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
