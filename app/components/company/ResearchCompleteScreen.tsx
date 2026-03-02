'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

const SIGNAL_ICONS: Record<string, string> = {
  earnings_call: '📊',
  product_announcement: '🚀',
  executive_hire: '👤',
  executive_departure: '👋',
  funding_round: '💰',
  acquisition: '🤝',
  industry_news: '📰',
  job_posting_signal: '📋',
};

export type EnrichmentResult = {
  companyId: string;
  companyName: string;
  signalsFound: number;
  contactsFound: number;
  employeeCount: string | null;
  signals: Array<{
    id: string;
    type: string;
    title: string;
    summary: string;
    url: string;
    publishedAt: string;
  }>;
  topContacts: Array<{
    id: string;
    name: string;
    title: string | null;
    email: string | null;
    linkedinUrl: string | null;
  }>;
};

type ResearchCompleteScreenProps = {
  results: EnrichmentResult;
};

export function ResearchCompleteScreen({ results }: ResearchCompleteScreenProps) {
  return (
    <div className="max-w-2xl mx-auto py-8 px-6 bg-gray-50 dark:bg-zinc-900 min-h-screen">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {results.companyName} is ready!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here&apos;s what we found
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {results.signals.length > 0 && (
          <div className="rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              🎯 High-intent signals detected
            </h3>
            <ul className="space-y-2">
              {results.signals.map((signal) => (
                <li key={signal.id} className="flex items-start gap-2 text-sm">
                  <span className="text-xl shrink-0">
                    {SIGNAL_ICONS[signal.type] ?? '📌'}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {signal.title}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 line-clamp-2">
                      {signal.summary}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {results.signalsFound > results.signals.length && (
              <p className="text-xs text-gray-500 mt-2">
                +{results.signalsFound - results.signals.length} more signal
                {results.signalsFound - results.signals.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        <div className="rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
            👥 Contacts discovered: {results.contactsFound}
          </h3>
          {results.topContacts.length > 0 ? (
            <ul className="space-y-2">
              {results.topContacts.slice(0, 8).map((contact) => (
                <li key={contact.id} className="text-sm text-gray-700 dark:text-gray-300">
                  • {contact.name}
                  {contact.title && (
                    <span className="text-gray-500 dark:text-gray-400"> — {contact.title}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No contacts found yet. Add them from the account page.</p>
          )}
          {results.contactsFound > results.topContacts.length && (
            <p className="text-xs text-gray-500 mt-2">
              +{results.contactsFound - results.topContacts.length} more contact
              {results.contactsFound - results.topContacts.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {results.employeeCount && (
          <div className="rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
              📊 Company context
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Employees: {results.employeeCount}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/dashboard/companies/${results.companyId}`}>
            View full account →
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link
            href={`/dashboard/companies/${results.companyId}/plays/run?suggested=true`}
          >
            Launch first plan →
          </Link>
        </Button>
      </div>
    </div>
  );
}
