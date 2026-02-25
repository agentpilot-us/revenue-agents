'use client';

import { useEffect, useState, useCallback } from 'react';
import { StaticSalesPage } from '@/app/go/StaticSalesPage';
import { CampaignTrack } from '@/app/go/CampaignTrack';
import { isSalesPageSections } from '@/types/sales-page';
import type { SalesPageSection } from '@/types/sales-page';

type PageSections = {
  events?: Array<{ title?: string; date?: string; description?: string; url?: string }>;
  caseStudy?: { title?: string; summary?: string; link?: string };
  successStory?: { title?: string; summary?: string; link?: string };
};

type CampaignPayload = {
  id: string;
  headline: string | null;
  subheadline: string | null;
  body: string | null;
  description: string | null;
  sections: unknown;
  pageSections: PageSections | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  url: string;
  company: { name: string; logoUrl?: string };
  department?: { customName: string | null; type: string } | null;
};

type Props = {
  campaign: CampaignPayload;
  isMultiDept?: boolean;
  children?: React.ReactNode; // for multi-dept layout that injects its own content
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

  const segmentName =
    campaign.department?.customName ??
    campaign.department?.type?.replace(/_/g, ' ') ??
    null;

  // New static sales page: sections array present
  const sections = isSalesPageSections(campaign.sections)
    ? (campaign.sections as SalesPageSection[])
    : null;

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

  if (sections && sections.length > 0) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <div className="max-w-2xl mx-auto px-6 py-12">
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
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-zinc-400">
            <CampaignTrack campaignId={campaign.id} />
            <span>Powered by AgentPilot</span>
          </div>
        </div>
      </div>
    );
  }

  // Legacy: headline + body + pageSections (events, caseStudy, successStory) + CTA — no chat
  const ps = campaign.pageSections;
  const hasEvents = ps?.events && ps.events.length > 0;
  const hasCaseStudy = ps?.caseStudy && (ps.caseStudy.title || ps.caseStudy.summary);
  const hasSuccessStory =
    ps?.successStory && (ps.successStory.title || ps.successStory.summary);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-8">
          {(campaign.company.logoUrl || segmentName) && (
            <div className="mb-4 flex items-center gap-3">
              {campaign.company.logoUrl && (
                <img
                  src={campaign.company.logoUrl}
                  alt={campaign.company.name}
                  className="h-8 w-auto object-contain"
                />
              )}
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {campaign.company.name}
                {segmentName ? ` · ${segmentName}` : ''}
              </p>
            </div>
          )}
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            {campaign.headline || 'Welcome'}
          </h1>
          {campaign.body && (
            <div
              className="prose prose-zinc dark:prose-invert prose-sm max-w-none mb-6"
              dangerouslySetInnerHTML={{ __html: campaign.body }}
            />
          )}
          {!campaign.body && campaign.description && (
            <p className="text-zinc-600 dark:text-zinc-300 mb-6 whitespace-pre-wrap">
              {campaign.description}
            </p>
          )}
          {hasEvents && (
            <section className="mb-6">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-3">
                Upcoming events
              </h2>
              <ul className="space-y-2">
                {ps!.events!.map((e, i) => (
                  <li key={i} className="text-sm text-zinc-600 dark:text-zinc-300">
                    {e.url ? (
                      <a
                        href={e.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        {e.title || 'Event'}
                      </a>
                    ) : (
                      <span className="font-medium">{e.title || 'Event'}</span>
                    )}
                    {e.date && (
                      <span className="text-zinc-500 dark:text-zinc-400 ml-2">
                        {e.date}
                      </span>
                    )}
                    {e.description && (
                      <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                        {e.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {hasCaseStudy && (
            <section className="mb-6 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                Case study
              </h2>
              <p className="font-medium text-zinc-800 dark:text-zinc-200">
                {ps!.caseStudy!.title}
              </p>
              {ps!.caseStudy!.summary && (
                <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">
                  {ps!.caseStudy!.summary}
                </p>
              )}
              {ps!.caseStudy!.link && (
                <a
                  href={ps!.caseStudy!.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-amber-600 dark:text-amber-400 hover:underline mt-2 inline-block"
                >
                  Read more
                </a>
              )}
            </section>
          )}
          {hasSuccessStory && (
            <section className="mb-6 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                Success story
              </h2>
              <p className="font-medium text-zinc-800 dark:text-zinc-200">
                {ps!.successStory!.title}
              </p>
              {ps!.successStory!.summary && (
                <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">
                  {ps!.successStory!.summary}
                </p>
              )}
              {ps!.successStory!.link && (
                <a
                  href={ps!.successStory!.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-amber-600 dark:text-amber-400 hover:underline mt-2 inline-block"
                >
                  Read more
                </a>
              )}
            </section>
          )}
          {(campaign.ctaLabel || campaign.ctaUrl) && (
            <div className="pt-4">
              <a
                href={campaign.ctaUrl || campaign.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-900 font-medium px-5 py-2.5 transition-colors"
              >
                {campaign.ctaLabel || 'Learn more'}
              </a>
            </div>
          )}
        </div>
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-zinc-400">
          <CampaignTrack campaignId={campaign.id} />
          <span>Powered by AgentPilot</span>
        </div>
      </div>
    </div>
  );
}
