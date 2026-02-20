'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Copy, BarChart3 } from 'lucide-react';

type TabId = 'departments' | 'overview' | 'contacts' | 'content' | 'engagement' | 'activity' | 'messaging' | 'campaigns' | 'map' | 'expansion';

type Props = {
  companyId: string;
  companyName: string;
  currentTab: TabId;
  hasResearch: boolean;
  hasDepartments: boolean;
  hasMessaging: boolean;
  hasContacts: boolean;
  hasContent: boolean;
  hasCampaign: boolean;
  campaignUrl?: string | null;
};

export function NextStepBar({
  companyId,
  companyName,
  currentTab,
  hasResearch,
  hasDepartments,
  hasMessaging,
  hasContacts,
  hasContent,
  hasCampaign,
  campaignUrl,
}: Props) {
  const allComplete = hasResearch && hasDepartments && hasMessaging && hasContacts && hasContent && hasCampaign;

  const isOnCompletedTab =
    (currentTab === 'contacts' && hasContacts) ||
    (currentTab === 'content' && hasContent) ||
    (currentTab === 'campaigns' && hasCampaign);

  const copyUrl = () => {
    if (campaignUrl && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(campaignUrl);
    }
  };

  if (allComplete) {
    return (
      <div className="rounded-lg border border-green-700/50 bg-green-900/20 p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
          <span aria-hidden>✓</span>
          <span>Your page is live</span>
        </div>
        <div className="flex items-center gap-2">
          {campaignUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={copyUrl}
              className="border-slate-600 text-slate-200"
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy URL
            </Button>
          )}
          <Link href={`/dashboard/analytics?companyId=${companyId}`}>
            <Button variant="outline" size="sm" className="border-slate-600 text-slate-200">
              <BarChart3 className="h-4 w-4 mr-1" />
              View Analytics
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isOnCompletedTab) {
    const statusLabel =
      currentTab === 'contacts'
        ? 'Contacts added'
        : currentTab === 'content'
          ? 'Content ready'
          : 'Sales page live';
    const nextStep = !hasContacts
      ? 'Find contacts'
      : !hasContent
        ? 'Content'
        : !hasCampaign
          ? 'Sales page'
          : null;
    return (
      <div className="rounded-lg border border-slate-700 bg-zinc-800/50 p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <span className="text-slate-300 text-sm">{statusLabel}</span>
        {nextStep && (
          <Link href={`/dashboard/companies/${companyId}?tab=${nextStep === 'Find contacts' ? 'contacts' : nextStep === 'Content' ? 'content' : 'campaigns'}`}>
            <Button size="sm" variant="outline" className="border-slate-600 text-slate-200">
              Next: {nextStep} →
            </Button>
          </Link>
        )}
      </div>
    );
  }

  const nextStep = !hasResearch || !hasDepartments || !hasMessaging
    ? 'account-intelligence'
    : !hasContacts
      ? 'contacts'
      : !hasContent
        ? 'content'
        : 'campaigns';

  const nextLabel =
    nextStep === 'account-intelligence'
      ? 'Account Intelligence'
      : nextStep === 'contacts'
        ? 'Find contacts'
        : nextStep === 'content'
          ? 'Content'
          : 'Sales page';

  const nextHref =
    nextStep === 'account-intelligence'
      ? `/dashboard/companies/${companyId}/intelligence`
      : `/dashboard/companies/${companyId}?tab=${nextStep}`;

  return (
    <div className="rounded-lg border border-slate-700 bg-zinc-800/50 p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
      <span className="text-slate-300 text-sm">Next: {nextLabel}</span>
      <Link href={nextHref}>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
          Continue →
        </Button>
      </Link>
    </div>
  );
}
