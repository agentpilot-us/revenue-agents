'use client';

import { PlayRulesPanel } from '@/app/components/roadmap/PlayRulesPanel';

type Props = {
  roadmapId: string;
  onComplete: () => void;
};

export function SignalRulesStep({ roadmapId, onComplete }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground">
        Configure signal→play rules and which plays are active for this account. When a signal
        fires, the matching play runs only if it’s activated for this account.
      </p>

      <PlayRulesPanel roadmapId={roadmapId} />

      <button
        type="button"
        onClick={onComplete}
        className="text-xs font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
      >
        Continue
      </button>
    </div>
  );
}
