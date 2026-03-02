import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';

export default async function BillingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  // Fetch usage statistics
  const [companiesCount, contactsCount, campaignsCount] = await Promise.all([
    prisma.company.count({ where: { userId: session.user.id } }),
    prisma.contact.count({ where: { company: { userId: session.user.id } } }),
    prisma.segmentCampaign.count({ where: { company: { userId: session.user.id } } }),
  ]);

  // For now, hardcode plan as "Free" - can be extended later with Stripe integration
  const currentPlan = 'Free';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-card-foreground">Billing</h1>
          <p className="text-muted-foreground">
            Manage your subscription and view usage
          </p>
        </div>

        {/* Current Plan */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-card-foreground">
            Current Plan
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-card-foreground">{currentPlan}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {currentPlan === 'Free'
                  ? 'Basic features included'
                  : 'Full access to all features'}
              </p>
            </div>
            <div>
              <a
                href="mailto:sales@example.com?subject=Upgrade Request"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Contact Sales to Upgrade
              </a>
            </div>
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-card-foreground">
            Usage Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Target Companies
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-card-foreground">
                {companiesCount}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Total Contacts
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-card-foreground">
                {contactsCount}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Campaigns
              </dt>
              <dd className="mt-1 text-3xl font-semibold text-card-foreground">
                {campaignsCount}
              </dd>
            </div>
          </div>
        </div>

        {/* Billing History (placeholder) */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-card-foreground">
            Billing History
          </h2>
          <p className="text-muted-foreground">
            {currentPlan === 'Free'
              ? 'No billing history available for free plans.'
              : 'Billing history will appear here once you upgrade.'}
          </p>
        </div>

        {/* Back to Settings */}
        <div className="mt-6">
          <Link
            href="/dashboard/settings"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            ← Back to Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
