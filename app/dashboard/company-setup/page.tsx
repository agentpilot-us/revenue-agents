import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getCompanySetupState } from '@/app/actions/content-library-setup';
import { CompanySetupWizard } from '@/app/components/company-setup/CompanySetupWizard';

/**
 * Company Setup = first-run onboarding for the user's company (seller's org).
 * When the user has no company info, show the 3-step wizard. Otherwise redirect to content-library.
 */
export default async function CompanySetupPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const setup = await getCompanySetupState();
  if (!setup.ok) {
    redirect('/login');
  }

  const { state, user } = setup;

  if (state !== 'needs_company_info') {
    redirect('/dashboard/content-library');
  }

  const initialData = {
    companyName: user.companyName ?? undefined,
    companyWebsite: user.companyWebsite ?? undefined,
    companyIndustry: user.companyIndustry ?? undefined,
    primaryIndustrySellTo: user.primaryIndustrySellTo ?? undefined,
    contentRefreshFrequency: user.contentRefreshFrequency ?? undefined,
    contentRefreshNextAt: user.contentRefreshNextAt ?? undefined,
    email: session.user.email ?? undefined,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 p-6">
      <CompanySetupWizard initialData={initialData} />
    </div>
  );
}
