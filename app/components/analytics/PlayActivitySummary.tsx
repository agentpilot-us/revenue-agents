'use client';

import { dash } from '@/app/dashboard/dashboard-classes';

interface PlayActivityData {
  playsStarted: number;
  playsInProgress: number;
  playsCompleted: number;
  totalSteps: number;
  completedSteps: number;
  completionRate: number;
  byChannel: Array<{ channel: string; count: number }>;
}

interface Props {
  data: PlayActivityData;
}

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  linkedin: 'LinkedIn',
  phone: 'Phone',
  meeting: 'Meeting',
  task: 'Task',
  other: 'Other',
};

export function PlayActivitySummary({ data }: Props) {
  return (
    <div className={dash.card}>
      <div className="mb-4">
        <h2 className={`text-xl font-semibold ${dash.sectionTitle} mb-1`}>Play Activity</h2>
        <p className="text-sm text-muted-foreground">
          Workflow execution across all plays
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className={dash.cardTight}>
          <div className="text-xs text-muted-foreground mb-1">Plays Started</div>
          <div className="text-2xl font-semibold text-foreground">{data.playsStarted}</div>
        </div>

        <div className={dash.cardTight}>
          <div className="text-xs text-muted-foreground mb-1">In Progress</div>
          <div className="text-2xl font-semibold text-primary">{data.playsInProgress}</div>
        </div>

        <div className={dash.cardTight}>
          <div className="text-xs text-muted-foreground mb-1">Completed</div>
          <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{data.playsCompleted}</div>
        </div>

        <div className={dash.cardTight}>
          <div className="text-xs text-muted-foreground mb-1">Steps Done</div>
          <div className="text-2xl font-semibold text-foreground">
            {data.completedSteps}
            <span className="text-sm text-muted-foreground">/{data.totalSteps}</span>
          </div>
        </div>

        <div className={dash.cardTight}>
          <div className="text-xs text-muted-foreground mb-1">Completion Rate</div>
          <div className="text-2xl font-semibold text-foreground">
            {(data.completionRate * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {data.byChannel.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Completed by Channel
          </h3>
          <div className="flex flex-wrap gap-3">
            {data.byChannel.map(({ channel, count }) => (
              <div
                key={channel}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-muted/30`}
              >
                <span className="text-xs text-muted-foreground">
                  {CHANNEL_LABELS[channel] || channel}
                </span>
                <span className="text-sm font-semibold text-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
