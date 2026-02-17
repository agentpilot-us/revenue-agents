import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { LandingPageAuthForm } from './LandingPageAuthForm';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function LandingPageAuthPage({ params, searchParams }: Props) {
  const { id: campaignId } = await params;
  const { error } = await searchParams;

  const campaign = await prisma.segmentCampaign.findUnique({
    where: { id: campaignId },
    include: {
      company: {
        select: {
          name: true,
          domain: true,
        },
      },
    },
  });

  if (!campaign) {
    notFound();
  }

  const companyName = campaign.company.name;
  const companyDomain = campaign.company.domain;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Verify Your Email
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Enter your {companyName} business email to access this page
              {companyDomain && (
                <>
                  <br />
                  <span className="font-medium">@{companyDomain}</span>
                </>
              )}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">
                {error === 'invalid_token' && 'Invalid verification link.'}
                {error === 'invalid_or_expired' && 'Verification link has expired or is invalid.'}
                {error === 'invalid_campaign' && 'Invalid campaign.'}
                {error === 'verification_failed' && 'Verification failed. Please try again.'}
                {!['invalid_token', 'invalid_or_expired', 'invalid_campaign', 'verification_failed'].includes(error) &&
                  'An error occurred. Please try again.'}
              </p>
            </div>
          )}

          <LandingPageAuthForm campaignId={campaignId} companyName={companyName} companyDomain={companyDomain} />
        </div>

        <div className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
          <p>Powered by AgentPilot</p>
        </div>
      </div>
    </div>
  );
}
