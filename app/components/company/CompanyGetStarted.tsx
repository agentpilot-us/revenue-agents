'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

type Props = {
  companyId: string;
  companyName: string;
  hasDepartments: boolean;
  hasContacts: boolean;
  hasMessaging?: boolean;
};

export function CompanyGetStarted({
  companyId,
  companyName,
  hasDepartments,
  hasContacts,
  hasMessaging = false,
}: Props) {
  const showGetStarted = !hasDepartments || !hasMessaging || !hasContacts;

  if (!showGetStarted) return null;

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow p-6 mb-6 border border-gray-200 dark:border-zinc-700">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        Get started with {companyName}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
        You haven&apos;t set up this account yet. Let&apos;s build your expansion plan.
      </p>

      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 dark:border-zinc-600 p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Step 1: Discover Departments</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                AI will research {companyName}&apos;s org structure and identify departments that could use your products.
              </p>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">~10 min</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/dashboard/companies/${companyId}/discover-departments`}>
              <Button>Discover Departments with AI</Button>
            </Link>
            <Link href={`/dashboard/companies/${companyId}/add-departments`}>
              <Button variant="outline">Add departments manually</Button>
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-zinc-600 p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Step 2: Set Up Account Messaging</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                Define why {companyName} should care, relevant use cases, and case studies. AI will use this when drafting personalized outreach.
              </p>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">~5 min</span>
          </div>
          <div className="mt-3">
            <Link href={`/dashboard/companies/${companyId}?tab=messaging`}>
              <Button variant="outline">Set Up Account Messaging</Button>
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-zinc-600 p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Step 3: Find Contacts</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                Find stakeholders in each department. Import from LinkedIn, paste from a list, or let AI discover them.
              </p>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">~15 min</span>
          </div>
          <div className="mt-3">
            {!hasDepartments ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Waiting for departments</p>
            ) : (
              <>
                {!hasMessaging && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Waiting for messaging (recommended first)</p>
                )}
                <Link href={`/dashboard/companies/${companyId}/add-contacts`}>
                  <Button variant="outline">Find Contacts</Button>
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-zinc-600 p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Step 4: Launch Outreach</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                AI drafts personalized emails, LinkedIn messages, and event invitations for each contact.
              </p>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">~20 min</span>
          </div>
          <div className="mt-3">
            {!hasContacts ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Waiting for contacts</p>
            ) : (
              <Link href={`/dashboard/companies/${companyId}/launch-outreach`}>
                <Button variant="outline">Launch Outreach</Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-zinc-600">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Already have contacts?</p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/dashboard/companies/${companyId}/add-contacts`}>
            <Button variant="outline" size="sm">Import Contacts</Button>
          </Link>
          <Link href={`/dashboard/companies/${companyId}/add-contacts?paste=linkedin`}>
            <Button variant="outline" size="sm">Paste from LinkedIn</Button>
          </Link>
          <Link href={`/dashboard/companies/${companyId}/add-contacts?manual=1`}>
            <Button variant="outline" size="sm">Add Manually</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
