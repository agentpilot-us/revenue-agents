'use client';

import { useState } from 'react';

const PREVIEW_CATEGORIES = [
  { value: 'new_csuite_executive', label: 'New C-Suite Executive' },
  { value: 'new_vp_hire', label: 'New VP-Level Hire' },
  { value: 'executive_departure', label: 'Executive Departure' },
  { value: 'earnings_beat', label: 'Quarterly Earnings Beat' },
  { value: 'earnings_miss', label: 'Quarterly Earnings Miss' },
  { value: 'acquisition_they_acquired', label: 'Acquisition (They Acquired)' },
  { value: 'strategic_partnership', label: 'Strategic Partnership' },
  { value: 'new_technology_adoption', label: 'New Technology Adoption' },
  { value: 'platform_migration', label: 'Platform Migration' },
  { value: 'product_launch_announcement', label: 'Product Launch' },
  { value: 'contract_renewal_window', label: 'Contract Renewal Window' },
  { value: 'champion_promoted', label: 'Champion Promoted' },
  { value: 'rapid_hiring_surge', label: 'Rapid Hiring Surge' },
  { value: 'event_webinar_registration', label: 'Event Registration' },
];

type PreviewResult = {
  signalCategory: string;
  signalDescription: string;
  matchedRule: { name: string; category: string } | null;
  matchedMapping: { actionType: string; autonomyLevel: string } | null;
  resolvedTemplate: {
    id: string;
    name: string;
    description: string | null;
    steps: Array<{ order: number; name: string; channel: string | null; description: string | null }>;
  } | null;
  targetDivision: { id: string; name: string } | null;
  targetContacts: Array<{ id: string; name: string; title: string | null }>;
  wouldCreate: string | null;
  message?: string;
};

type Props = {
  roadmapId: string;
  onClose: () => void;
};

export function SignalPreviewModal({ roadmapId, onClose }: Props) {
  const [category, setCategory] = useState(PREVIEW_CATEGORIES[0].value);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(
        `/api/roadmap/preview-signal?roadmapId=${roadmapId}&signalCategory=${category}`
      );
      if (res.ok) {
        const data = await res.json();
        setResult(data.preview);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-xl border border-border bg-background shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">Signal Preview</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Simulate what happens when a signal fires
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex-1 text-sm rounded-md border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {PREVIEW_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handlePreview}
              disabled={loading}
              className="text-xs font-medium bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Simulating...' : 'Preview'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!result && !loading && (
            <p className="text-xs text-muted-foreground text-center py-8">
              Select a signal category and click Preview to simulate.
            </p>
          )}

          {loading && (
            <p className="text-xs text-muted-foreground text-center py-8 animate-pulse">
              Running signal matching...
            </p>
          )}

          {result && (
            <div className="space-y-4">
              {/* Signal */}
              <div className="rounded-lg border border-border bg-card/60 p-3">
                <p className="text-[10px] text-muted-foreground mb-1">Signal Fired</p>
                <p className="text-xs font-medium">{result.signalDescription}</p>
              </div>

              {/* Rule Match */}
              <div className={`rounded-lg border p-3 ${
                result.matchedRule
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-amber-500/20 bg-amber-500/5'
              }`}>
                <p className="text-[10px] text-muted-foreground mb-1">Rule Match</p>
                {result.matchedRule ? (
                  <p className="text-xs">
                    <span className="font-medium text-emerald-400">{result.matchedRule.name}</span>
                    <span className="text-muted-foreground ml-2">({result.matchedRule.category})</span>
                  </p>
                ) : (
                  <p className="text-xs text-amber-400">No matching rule found</p>
                )}
                {result.matchedMapping && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Action: {result.matchedMapping.actionType} / Autonomy: {result.matchedMapping.autonomyLevel}
                  </p>
                )}
              </div>

              {/* Template */}
              <div className={`rounded-lg border p-3 ${
                result.resolvedTemplate
                  ? 'border-blue-500/20 bg-blue-500/5'
                  : 'border-red-500/20 bg-red-500/5'
              }`}>
                <p className="text-[10px] text-muted-foreground mb-1">Resolved Template</p>
                {result.resolvedTemplate ? (
                  <>
                    <p className="text-xs font-medium text-blue-400">{result.resolvedTemplate.name}</p>
                    {result.resolvedTemplate.description && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{result.resolvedTemplate.description}</p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-red-400">{result.message || 'No template resolved'}</p>
                )}
              </div>

              {/* Workflow Steps Preview */}
              {result.resolvedTemplate && result.resolvedTemplate.steps.length > 0 && (
                <div className="rounded-lg border border-border bg-card/60 p-3">
                  <p className="text-[10px] text-muted-foreground mb-2">Workflow Steps</p>
                  <div className="space-y-1.5">
                    {result.resolvedTemplate.steps.map((step) => (
                      <div key={step.order} className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-muted-foreground w-4 text-center">
                          {step.order}
                        </span>
                        <span className="text-[11px]">{step.name}</span>
                        {step.channel && (
                          <span className="text-[9px] text-muted-foreground bg-card/80 border border-border/50 px-1 py-0.5 rounded">
                            {step.channel}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Targeting */}
              {(result.targetDivision || result.targetContacts.length > 0) && (
                <div className="rounded-lg border border-border bg-card/60 p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Targeting</p>
                  {result.targetDivision && (
                    <p className="text-[11px]">Division: {result.targetDivision.name}</p>
                  )}
                  {result.targetContacts.map((c) => (
                    <p key={c.id} className="text-[11px]">
                      {c.name} {c.title && <span className="text-muted-foreground">— {c.title}</span>}
                    </p>
                  ))}
                </div>
              )}

              {/* Result */}
              <div className={`rounded-lg border p-3 ${
                result.wouldCreate
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-red-500/20 bg-red-500/5'
              }`}>
                <p className="text-[10px] text-muted-foreground mb-1">Result</p>
                {result.wouldCreate ? (
                  <p className="text-xs text-emerald-400 font-medium">
                    Would create: {result.wouldCreate}
                  </p>
                ) : (
                  <p className="text-xs text-red-400">No workflow would be created</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
