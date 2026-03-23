'use client';

import Link from 'next/link';
import { dash } from '@/app/dashboard/dashboard-classes';

interface LandingPageData {
  campaignId: string;
  campaignTitle: string;
  campaignSlug: string;
  accountId: string;
  accountName: string;
  visits: number;
  uniqueVisitors: number;
  chatMessages: number;
  ctaClicks: number;
}

interface Props {
  data: LandingPageData[];
}

export function LandingPagePerformance({ data }: Props) {
  return (
    <div className={dash.card}>
      <div className="mb-4">
        <h2 className={`text-xl font-semibold ${dash.sectionTitle} mb-1`}>Landing Page Performance</h2>
        <p className="text-sm text-muted-foreground">
          {data.length} campaign{data.length !== 1 ? 's' : ''} tracked
        </p>
      </div>

      {data.length > 0 ? (
        <div className="space-y-4">
          {data.map((campaign) => (
            <div
              key={campaign.campaignId}
              className={dash.cardTight}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <Link
                    href={`/dashboard/companies/${campaign.accountId}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {campaign.accountName}
                  </Link>
                  <h3 className="text-base font-semibold text-foreground mt-1">
                    {campaign.campaignTitle}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Visits</div>
                  <div className="text-lg font-semibold text-foreground">{campaign.visits}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Unique Visitors</div>
                  <div className="text-lg font-semibold text-foreground">
                    {campaign.uniqueVisitors}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Chat Messages</div>
                  <div className="text-lg font-semibold text-foreground">
                    {campaign.chatMessages}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">CTA Clicks</div>
                  <div className="text-lg font-semibold text-primary">{campaign.ctaClicks}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No landing page data available</p>
      )}
    </div>
  );
}
