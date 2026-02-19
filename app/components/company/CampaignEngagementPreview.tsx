'use client';

import { useEffect, useState } from 'react';

type EngagementMetrics = {
  totalVisits: number;
  uniqueVisitors: number;
  chatMessages: number;
  ctaClicks: number;
};

type Props = {
  campaignId: string;
  companyId: string;
};

export function CampaignEngagementPreview({ campaignId, companyId }: Props) {
  const [metrics, setMetrics] = useState<EngagementMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch(`/api/companies/${companyId}/campaigns/${campaignId}/engagement`);
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (error) {
        console.error('Failed to fetch engagement metrics:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, [campaignId, companyId]);

  if (loading) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">Loading engagement metrics...</div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Engagement Preview
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-gray-500 dark:text-gray-400">Visits</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {metrics.totalVisits}
          </div>
        </div>
        <div>
          <div className="text-gray-500 dark:text-gray-400">Unique Visitors</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {metrics.uniqueVisitors}
          </div>
        </div>
        <div>
          <div className="text-gray-500 dark:text-gray-400">Chat Interactions</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {metrics.chatMessages}
          </div>
        </div>
        <div>
          <div className="text-gray-500 dark:text-gray-400">CTA Clicks</div>
          <div className="text-lg font-semibold text-green-600 dark:text-green-400">
            {metrics.ctaClicks}
          </div>
        </div>
      </div>
    </div>
  );
}
