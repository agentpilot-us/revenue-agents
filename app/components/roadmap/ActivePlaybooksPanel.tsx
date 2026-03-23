'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type PlayRunSummary = {
  id: string;
  title: string;
  status: string;
  templateName: string;
  phaseCount: number;
  completedActions?: number;
  totalActions?: number;
  activatedAt: string;
};

type Props = {
  roadmapId: string;
  companyId?: string;
  companyName?: string;
  initialPlayMode?: 'custom';
  initialDivisionId?: string;
};

function ManagePlaySettingsLink() {
  return (
    <Link
      href="/dashboard/my-company?tab=Playbooks"
      className="inline-flex text-sm font-semibold text-primary hover:text-primary/90 transition-colors"
    >
      Manage play settings in My Company →
    </Link>
  );
}

function AccountExecutionSection({
  companyId,
  companyName,
  playRuns,
}: {
  companyId: string;
  companyName: string;
  playRuns: PlayRunSummary[];
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Plays for this account</h3>
      {playRuns.length === 0 ? (
        <p className="text-xs text-muted-foreground">No active, proposed, or paused plays.</p>
      ) : (
        <ul className="space-y-2">
          {playRuns.map((run) => {
            const isPaused = run.status === 'PAUSED';
            const progress =
              run.totalActions != null && run.totalActions > 0
                ? Math.round(((run.completedActions ?? 0) / run.totalActions) * 100)
                : null;
            return (
              <li
                key={run.id}
                className={`rounded-lg border p-3 ${
                  isPaused
                    ? 'border-amber-500/20 bg-amber-500/5 opacity-80'
                    : 'border-border bg-card/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={`text-xs font-medium ${isPaused ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {run.templateName}
                  </span>
                  <span
                    className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                      isPaused
                        ? 'bg-amber-500/10 text-amber-400/90 border-amber-500/25'
                        : run.status === 'PROPOSED'
                          ? 'bg-violet-500/10 text-violet-400 border-violet-500/25'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                    }`}
                  >
                    {run.status}
                  </span>
                </div>
                {progress != null && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary/60 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {run.completedActions ?? 0}/{run.totalActions ?? 0} steps
                    </span>
                  </div>
                )}
                <Link
                  href={`/dashboard/companies/${companyId}/plays/run/${run.id}`}
                  className="mt-2 inline-block text-[10px] font-medium text-blue-400 hover:text-blue-300"
                >
                  View run →
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Link
        href={`/dashboard/plays?companyId=${companyId}`}
        className="inline-flex items-center justify-center rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
      >
        Start a play for {companyName}
      </Link>
    </div>
  );
}

export function ActivePlaybooksPanel(props: Props) {
  const { companyId, companyName } = props;
  const [playRuns, setPlayRuns] = useState<PlayRunSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      if (companyId) {
        const res = await fetch(
          `/api/companies/${companyId}/play-runs?status=ACTIVE,PROPOSED,PAUSED&progress=1`,
        );
        if (res.ok) {
          const data = await res.json();
          setPlayRuns(data.playRuns ?? []);
        }
      } else {
        setPlayRuns([]);
      }
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground animate-pulse">Loading plays for this account...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {companyId && companyName && (
        <AccountExecutionSection companyId={companyId} companyName={companyName} playRuns={playRuns} />
      )}

      <div className="rounded-lg border border-border/60 bg-card/30 px-4 py-3 space-y-2">
        {!companyId && (
          <p className="text-xs text-muted-foreground">
            Play approvals and automation for accounts are configured in My Company. Open an account from the roadmap to
            see runs and start plays here.
          </p>
        )}
        {companyId && companyName && (
          <p className="text-xs text-muted-foreground">
            Approve plays, autonomy, and templates for this account in My Company.
          </p>
        )}
        <ManagePlaySettingsLink />
      </div>
    </div>
  );
}
