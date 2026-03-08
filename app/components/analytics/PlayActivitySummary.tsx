'use client';

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
    <div className="p-6 bg-zinc-800/50 border border-slate-700 rounded-lg">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-100 mb-1">Play Activity</h2>
        <p className="text-sm text-slate-400">
          Workflow execution across all plays
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="p-4 bg-zinc-900/50 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">Plays Started</div>
          <div className="text-2xl font-semibold text-slate-200">{data.playsStarted}</div>
        </div>

        <div className="p-4 bg-zinc-900/50 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">In Progress</div>
          <div className="text-2xl font-semibold text-blue-400">{data.playsInProgress}</div>
        </div>

        <div className="p-4 bg-zinc-900/50 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">Completed</div>
          <div className="text-2xl font-semibold text-green-400">{data.playsCompleted}</div>
        </div>

        <div className="p-4 bg-zinc-900/50 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">Steps Done</div>
          <div className="text-2xl font-semibold text-slate-200">
            {data.completedSteps}
            <span className="text-sm text-slate-500">/{data.totalSteps}</span>
          </div>
        </div>

        <div className="p-4 bg-zinc-900/50 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">Completion Rate</div>
          <div className="text-2xl font-semibold text-slate-200">
            {(data.completionRate * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {data.byChannel.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Completed by Channel
          </h3>
          <div className="flex flex-wrap gap-3">
            {data.byChannel.map(({ channel, count }) => (
              <div
                key={channel}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 rounded-md border border-slate-700"
              >
                <span className="text-xs text-slate-400">
                  {CHANNEL_LABELS[channel] || channel}
                </span>
                <span className="text-sm font-semibold text-slate-200">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
