'use client';

import { useEffect, useState } from 'react';
import { StaticSalesPage } from '@/app/go/StaticSalesPage';
import { CampaignTrack } from '@/app/go/CampaignTrack';
import { isSalesPageSections } from '@/types/sales-page';
import type { SalesPageSection } from '@/types/sales-page';

type CampaignPayload = {
  id: string;
  headline: string | null;
  subheadline: string | null;
  sections: unknown;
  ctaLabel: string | null;
  ctaUrl: string | null;
  url: string;
  company: { name: string; logoUrl?: string };
  department?: { customName: string | null; type: string } | null;
};

type Props = {
  campaign: CampaignPayload;
  isMultiDept?: boolean;
  children?: React.ReactNode;
};

export function GoPageContent({ campaign, isMultiDept, children }: Props) {
  const [visitId, setVisitId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const sessionId =
      typeof window !== 'undefined'
        ? sessionStorage.getItem('campaign_session_id') ||
          (() => {
            const s = `s_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
            sessionStorage.setItem('campaign_session_id', s);
            return s;
          })()
        : undefined;
    fetch(`/api/go/${campaign.id}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'visit', sessionId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.visitId) setVisitId(data.visitId);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [campaign.id]);

  const sections = isSalesPageSections(campaign.sections)
    ? (campaign.sections as SalesPageSection[])
    : [];

  if (isMultiDept && children) {
    return (
      <>
        {children}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-zinc-400">
          <CampaignTrack campaignId={campaign.id} />
          <span>Powered by AgentPilot</span>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <StaticSalesPage
            companyName={campaign.company.name}
            logoUrl={campaign.company.logoUrl}
            headline={campaign.headline}
            subheadline={campaign.subheadline}
            sections={sections}
            ctaLabel={campaign.ctaLabel}
            ctaUrl={campaign.ctaUrl}
            campaignId={campaign.id}
            visitId={visitId}
          />
        </div>
        <div className="mt-6 mb-8 flex items-center justify-center gap-4 text-xs text-zinc-400">
          <CampaignTrack campaignId={campaign.id} />
          <span>Powered by AgentPilot</span>
        </div>
      </div>
    </div>
  );
}
