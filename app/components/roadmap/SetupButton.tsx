'use client';

import { useState } from 'react';
import { AccountSetupWizard } from './AccountSetupWizard';

type Props = {
  companyId: string;
  roadmapId: string | null;
};

export function SetupButton({ companyId, roadmapId }: Props) {
  const [showWizard, setShowWizard] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowWizard(true)}
        className="text-xs font-medium bg-card text-foreground border border-border px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
      >
        Setup Account
      </button>
      {showWizard && (
        <AccountSetupWizard
          companyId={companyId}
          roadmapId={roadmapId}
          onClose={() => setShowWizard(false)}
        />
      )}
    </>
  );
}
