'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

type Props = {
  companyId: string;
  companyName: string;
  hasDepartments: boolean;
  hasContacts: boolean;
  hasMessaging?: boolean;
  hasResearch?: boolean;
  hasLaunchedCampaign?: boolean;
};

export function CompanyGetStarted({
  companyId,
  companyName,
  hasDepartments,
  hasContacts,
  hasMessaging = false,
  hasResearch = false,
  hasLaunchedCampaign = false,
}: Props) {
  const hasIntelligence = hasResearch && hasDepartments && hasMessaging;
  const showGetStarted = !hasIntelligence || !hasLaunchedCampaign;

  if (!showGetStarted) return null;

  return (
    <div className="bg-card rounded-lg shadow p-6 mb-6 border border-border">
      <h2 className="text-lg font-semibold text-card-foreground mb-1">
        Get started with {companyName}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Set up account intelligence, then create your AI-powered sales page and chat. New contacts from the landing page are pushed to your CRM nightly.
      </p>

      <div className="space-y-4">
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-medium text-card-foreground">
                Step 1: Account Intelligence {(hasResearch && hasDepartments && hasMessaging) && <span className="text-green-600 dark:text-green-400">✓</span>}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Research the account with AI, review divisions, and generate account messaging in one flow. Review and edit before moving on.
              </p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">~5 min</span>
          </div>
          <div className="mt-3">
            <Link href={`/dashboard/companies/${companyId}?tab=contacts&action=find`}>
              <Button variant="outline">
                {(hasResearch && hasDepartments && hasMessaging) ? 'Review Account Intelligence' : 'Set up Account Intelligence'}
              </Button>
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-medium text-card-foreground">
                Step 2: AI Powered Custom Sales Pages + Chat {(hasLaunchedCampaign) && <span className="text-green-600 dark:text-green-400">✓</span>}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Create a custom sales page with chat. Configure headline, body, and CTA, then launch to get a shareable URL. Visits, chats, and new leads are tracked and pushed to your CRM nightly.
              </p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">~5 min</span>
          </div>
          <div className="mt-3">
            {!hasIntelligence ? (
              <p className="text-sm text-muted-foreground">Complete Account Intelligence first</p>
            ) : (
              <Link href={`/dashboard/companies/${companyId}?tab=content`}>
                <Button variant="outline">{hasLaunchedCampaign ? 'View Sales Pages' : 'Create Sales Page + Chat'}</Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground mb-2">Import contacts from CRM</p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/dashboard/companies/${companyId}/contacts`}>
            <Button variant="outline" size="sm">Contacts (from CRM)</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
