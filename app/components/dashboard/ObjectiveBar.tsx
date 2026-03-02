'use client';

import { dash } from '@/app/dashboard/dashboard-classes';

type ObjectiveBarProps = {
  goalText: string;
  landedCount?: number;
  targetCount?: number;
  divisionStates: Array<{ name: string; stage: string }>;
  progressPct?: number;
};

/** Stage → color mapping for the division state pills */
function stageColor(stage: string): string {
  const s = stage.toLowerCase();
  if (s.includes('active')) return 'var(--ap-stage-active)';
  if (s.includes('expansion')) return 'var(--ap-stage-expansion)';
  if (s.includes('strategic')) return 'var(--ap-stage-strategic)';
  if (s.includes('emerging')) return 'var(--ap-stage-emerging)';
  if (s.includes('poc')) return 'var(--ap-stage-poc)';
  if (s.includes('closed') || s.includes('won')) return 'var(--ap-stage-closed-won)';
  return 'var(--ap-text-muted)';
}

export function ObjectiveBar({
  goalText,
  landedCount = 0,
  targetCount,
  divisionStates,
  progressPct,
}: ObjectiveBarProps) {
  return (
    <div className={dash.objectiveBar}>
      <div className={dash.objectiveBarInner}>
        {/* Icon + Goal text */}
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className={dash.objectiveBarIcon}>🎯</div>
          <div>
            <div className={dash.objectiveBarLabel}>Roadmap Objective</div>
            <div className={dash.objectiveBarGoal}>{goalText}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-5 flex-wrap">
          {targetCount != null && (
            <div className={dash.objectiveBarStat}>
              <div
                className={dash.objectiveBarStatValue}
                style={{ color: 'var(--ap-green)' }}
              >
                {landedCount}
                <span className={dash.objectiveBarStatSub}>/{targetCount}</span>
              </div>
              <div className={dash.objectiveBarStatLabel}>Landed</div>
            </div>
          )}

          {/* Division state pills */}
          {divisionStates.length > 0 && (
            <>
              <span className={dash.objectiveBarDivider} aria-hidden>
                |
              </span>
              <div className="flex flex-wrap gap-2">
                {divisionStates.slice(0, 5).map((d) => (
                  <span
                    key={d.name}
                    className="inline-flex items-center gap-1.5 text-[11px] text-[var(--ap-text-secondary)]"
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{ background: stageColor(d.stage) }}
                    />
                    <span className="font-medium">{d.name}:</span>
                    <span style={{ color: stageColor(d.stage) }}>{d.stage}</span>
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Progress bar */}
          {progressPct != null && (
            <div className={dash.objectiveBarProgress}>
              <div className={dash.objectiveBarProgressLabel}>
                <span>Progress</span>
                <span className="font-semibold text-[var(--ap-text-secondary)]">
                  {landedCount}/{targetCount ?? '?'}
                </span>
              </div>
              <div className={dash.objectiveBarProgressTrack}>
                <div
                  className={dash.objectiveBarProgressFill}
                  style={{ width: `${Math.max(progressPct, 3)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
