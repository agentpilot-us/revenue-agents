'use client';

interface EmailEngagementData {
  sent: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickRate: number;
}

interface Props {
  data: EmailEngagementData;
}

export function EmailEngagement({ data }: Props) {
  return (
    <div className="p-6 bg-zinc-800/50 border border-slate-700 rounded-lg">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-100 mb-1">Email Engagement</h2>
        <p className="text-sm text-slate-400">Email performance metrics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-zinc-900/50 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">Emails Sent</div>
          <div className="text-2xl font-semibold text-slate-200">{data.sent}</div>
        </div>

        <div className="p-4 bg-zinc-900/50 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">Emails Opened</div>
          <div className="text-2xl font-semibold text-slate-200">{data.opened}</div>
        </div>

        <div className="p-4 bg-zinc-900/50 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">Emails Clicked</div>
          <div className="text-2xl font-semibold text-amber-400">{data.clicked}</div>
        </div>

        <div className="p-4 bg-zinc-900/50 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">Open Rate</div>
          <div className="text-2xl font-semibold text-slate-200">
            {data.openRate.toFixed(1)}%
          </div>
        </div>

        <div className="p-4 bg-zinc-900/50 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">Click Rate</div>
          <div className="text-2xl font-semibold text-amber-400">
            {data.clickRate.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}
