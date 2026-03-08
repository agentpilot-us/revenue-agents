'use client';

import { useState, useEffect, useCallback } from 'react';
import AccountPlaysTab from '@/app/components/plays/AccountPlaysTab';

type TemplateOption = {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  isBuiltIn: boolean;
  expectedOutcome: string | null;
  priority: number;
  targetDepartmentTypes: string[] | null;
  targetPersonas: string[] | null;
  _count: { steps: number };
};

type Activation = {
  id: string;
  templateId: string;
  isActive: boolean;
  customConfig: Record<string, unknown> | null;
  activatedAt: string;
  template: TemplateOption;
};

type AutonLevel = 'notify' | 'draft_review' | 'auto_execute';

const AUTONOMY_OPTIONS: { value: AutonLevel; label: string; desc: string }[] = [
  { value: 'notify', label: 'Notify Only', desc: 'Alert the AE when triggered' },
  { value: 'draft_review', label: 'Draft + Review', desc: 'Generate drafts, AE approves before send' },
  { value: 'auto_execute', label: 'Auto-Execute', desc: 'Fully automated — sends without review' },
];

const TRIGGER_COLORS: Record<string, string> = {
  signal: 'bg-red-500/10 text-red-400 border-red-500/25',
  event: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
  feature_release: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  renewal: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  new_exec_intro: 'bg-violet-500/10 text-violet-400 border-violet-500/25',
  new_logo: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',
};

type Props = {
  roadmapId: string;
  companyId?: string;
  companyName?: string;
};

export function ActivePlaybooksPanel({ roadmapId, companyId, companyName }: Props) {
  const [activations, setActivations] = useState<Activation[]>([]);
  const [allTemplates, setAllTemplates] = useState<TemplateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [adding, setAdding] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [actRes, tmplRes] = await Promise.all([
        fetch(`/api/roadmap/playbook-activations?roadmapId=${roadmapId}`),
        fetch('/api/playbooks/templates'),
      ]);

      if (actRes.ok) {
        const data = await actRes.json();
        setActivations(data.activations ?? []);
      }
      if (tmplRes.ok) {
        const data = await tmplRes.json();
        setAllTemplates(data.templates ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [roadmapId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeIds = new Set(activations.map((a) => a.templateId));
  const available = allTemplates.filter((t) => !activeIds.has(t.id));

  const handleActivate = async (templateId: string) => {
    setAdding(true);
    try {
      await fetch('/api/roadmap/playbook-activations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roadmapId, templateId }),
      });
      setShowPicker(false);
      await fetchData();
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (activationId: string) => {
    await fetch(`/api/roadmap/playbook-activations/${activationId}`, { method: 'DELETE' });
    await fetchData();
  };

  const handleAutonomyChange = async (activationId: string, current: Activation, level: AutonLevel) => {
    const newConfig = { ...(current.customConfig ?? {}), autonomyLevel: level };
    await fetch(`/api/roadmap/playbook-activations/${activationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customConfig: newConfig }),
    });
    await fetchData();
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground animate-pulse">Loading approved plays...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {activations.length === 0
            ? 'No plays approved for this account yet.'
            : `${activations.length} play${activations.length === 1 ? '' : 's'} approved`}
        </p>
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          {showPicker ? 'Cancel' : '+ Add Play'}
        </button>
      </div>

      {showPicker && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
          <p className="text-xs font-medium text-blue-300 mb-2">Select from Play Library</p>
          {available.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              All available plays are already approved. Create new ones on My Company &rarr; Playbooks.
            </p>
          ) : (
            <div className="grid gap-2 max-h-64 overflow-y-auto">
              {available.map((t) => {
                const colorCls = TRIGGER_COLORS[t.triggerType ?? ''] ?? 'bg-card/60 text-muted-foreground border-border';
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={adding}
                    onClick={() => handleActivate(t.id)}
                    className="text-left rounded-lg border border-border bg-card/60 p-3 hover:border-blue-500/40 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">{t.name}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${colorCls}`}>
                        {t.triggerType ?? 'manual'}
                      </span>
                    </div>
                    {t.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{t.description}</p>
                    )}
                    <div className="text-[10px] text-muted-foreground/70 mt-1">
                      {t._count?.steps ?? 0} steps
                      {t.targetDepartmentTypes && (t.targetDepartmentTypes as string[]).length > 0 && (
                        <span className="ml-2">
                          &middot; Targets: {(t.targetDepartmentTypes as string[]).slice(0, 3).join(', ')}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {activations.map((act) => {
          const t = act.template;
          const colorCls = TRIGGER_COLORS[t.triggerType ?? ''] ?? 'bg-card/60 text-muted-foreground border-border';
          const autonomy = ((act.customConfig as Record<string, unknown>)?.autonomyLevel as AutonLevel) ?? 'draft_review';
          const deptTypes = (t.targetDepartmentTypes ?? []) as string[];
          const personas = (t.targetPersonas ?? []) as string[];

          return (
            <div
              key={act.id}
              className="rounded-lg border border-border bg-card/60 p-4 space-y-3"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{t.name}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${colorCls}`}>
                      {t.triggerType ?? 'manual'}
                    </span>
                    {t.priority > 0 && (
                      <span className="text-[9px] font-medium text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                        Priority {t.priority}
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(act.id)}
                  className="text-[10px] text-red-400 hover:text-red-300 px-2 py-1 shrink-0 rounded hover:bg-red-500/10 transition-colors"
                >
                  Remove
                </button>
              </div>

              {/* Details row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                <span>{t._count?.steps ?? 0} steps</span>
                {deptTypes.length > 0 && (
                  <span>Targets: {deptTypes.map((d) => d.replace(/_/g, ' ')).join(', ')}</span>
                )}
                {personas.length > 0 && (
                  <span>Personas: {personas.join(', ')}</span>
                )}
              </div>

              {t.expectedOutcome && (
                <p className="text-[11px] text-emerald-400/80 bg-emerald-500/5 border border-emerald-500/10 rounded px-2.5 py-1.5">
                  Expected: {t.expectedOutcome}
                </p>
              )}

              {/* Autonomy level selector */}
              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Autonomy Level</p>
                <div className="flex gap-1.5">
                  {AUTONOMY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleAutonomyChange(act.id, act, opt.value)}
                      title={opt.desc}
                      className={`text-[10px] font-medium px-2.5 py-1 rounded border transition-colors ${
                        autonomy === opt.value
                          ? 'bg-primary/15 text-primary border-primary/30'
                          : 'bg-card/40 text-muted-foreground border-border hover:border-primary/20'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {companyId && companyName && (
        <div className="mt-8 pt-6 border-t border-border/40">
          <h3 className="text-sm font-semibold text-foreground mb-4">Play Execution</h3>
          <AccountPlaysTab companyId={companyId} companyName={companyName} />
        </div>
      )}
    </div>
  );
}
