'use client';

import { dash } from '@/app/dashboard/dashboard-classes';

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
    <div className={dash.card}>
      <div className="mb-4">
        <h2 className={`text-xl font-semibold ${dash.sectionTitle} mb-1`}>Email Engagement</h2>
        <p className="text-sm text-muted-foreground">Email performance metrics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className={dash.cardTight}>
          <div className="text-xs text-muted-foreground mb-1">Emails Sent</div>
          <div className="text-2xl font-semibold text-foreground">{data.sent}</div>
        </div>

        <div className={dash.cardTight}>
          <div className="text-xs text-muted-foreground mb-1">Emails Opened</div>
          <div className="text-2xl font-semibold text-foreground">{data.opened}</div>
        </div>

        <div className={dash.cardTight}>
          <div className="text-xs text-muted-foreground mb-1">Emails Clicked</div>
          <div className="text-2xl font-semibold text-primary">{data.clicked}</div>
        </div>

        <div className={dash.cardTight}>
          <div className="text-xs text-muted-foreground mb-1">Open Rate</div>
          <div className="text-2xl font-semibold text-foreground">
            {data.openRate.toFixed(1)}%
          </div>
        </div>

        <div className={dash.cardTight}>
          <div className="text-xs text-muted-foreground mb-1">Click Rate</div>
          <div className="text-2xl font-semibold text-primary">
            {data.clickRate.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}
