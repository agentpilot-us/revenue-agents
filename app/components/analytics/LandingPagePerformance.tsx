'use client';

import Link from 'next/link';

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
    <div className="p-6 bg-zinc-800/50 border border-slate-700 rounded-lg">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-100 mb-1">Landing Page Performance</h2>
        <p className="text-sm text-slate-400">
          {data.length} campaign{data.length !== 1 ? 's' : ''} tracked
        </p>
      </div>

      {data.length > 0 ? (
        <div className="space-y-4">
          {data.map((campaign) => (
            <div
              key={campaign.campaignId}
              className="p-4 bg-zinc-900/50 rounded-lg border border-slate-700"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <Link
                    href={`/dashboard/companies/${campaign.accountId}`}
                    className="text-sm font-medium text-amber-400 hover:text-amber-300"
                  >
                    {campaign.accountName}
                  </Link>
                  <h3 className="text-base font-semibold text-slate-100 mt-1">
                    {campaign.campaignTitle}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Visits</div>
                  <div className="text-lg font-semibold text-slate-200">{campaign.visits}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Unique Visitors</div>
                  <div className="text-lg font-semibold text-slate-200">
                    {campaign.uniqueVisitors}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Chat Messages</div>
                  <div className="text-lg font-semibold text-slate-200">
                    {campaign.chatMessages}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">CTA Clicks</div>
                  <div className="text-lg font-semibold text-amber-400">{campaign.ctaClicks}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No landing page data available</p>
      )}
    </div>
  );
}
