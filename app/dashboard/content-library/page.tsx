import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getCompanySetupState } from '@/app/actions/content-library-setup';
import { CompanyBasicInfoForm } from '@/app/components/content-library/CompanyBasicInfoForm';
import { ImportProgress } from '@/app/components/content-library/ImportProgress';
import { ReviewImportedContent } from '@/app/components/content-library/ReviewImportedContent';
import { ContentLibraryView } from '@/app/components/content-library/ContentLibraryView';

export default async function ContentLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const setup = await getCompanySetupState();
  if (!setup.ok) {
    redirect('/login');
  }

  const { state, user, latestImport } = setup;
  const params = await searchParams;
  const tabParam = params.tab;

  // Redirect all tabs to dedicated pages
  if (tabParam) {
    const CONTENT_TAB_ROUTES: Record<string, string> = {
      Framework: '/dashboard/content-library/frameworks',
      UseCase: '/dashboard/content-library/use-cases',
      SuccessStory: '/dashboard/content-library/case-studies',
      CompanyEvent: '/dashboard/content-library/events',
      products: '/dashboard/content-library/products',
      industries: '/dashboard/content-library/industries',
    };
    if (tabParam in CONTENT_TAB_ROUTES) {
      const path = CONTENT_TAB_ROUTES[tabParam];
      const redirectUrl = params.product ? `${path}?product=${params.product}` : path;
      redirect(redirectUrl);
    }
  }

  // ========================================
  // STATE-BASED ROUTING (early return each branch)
  // ========================================

  // State 1: Needs company info or no content yet
  if (state === 'needs_company_info' || state === 'needs_content') {
    const failedError =
      state === 'needs_content' &&
      latestImport?.status === 'FAILED' &&
      latestImport?.errors &&
      typeof latestImport.errors === 'object' &&
      'error' in latestImport.errors
        ? String((latestImport.errors as { error?: string }).error)
        : undefined;
    const message =
      failedError ||
      (state === 'needs_content'
        ? 'You have no content yet. Start a smart import to discover pages from your website.'
        : undefined);
    return (
      <CompanyBasicInfoForm
        existingData={user}
        message={message}
        skipToImport={state === 'needs_content'}
      />
    );
  }

  // State 2: Import in progress
  if (state === 'importing' && latestImport) {
    return <ImportProgress importJob={latestImport} />;
  }

  // State 3: Needs review after import
  if (state === 'needs_review' && latestImport) {
    return <ReviewImportedContent importJob={latestImport} />;
  }

  // State 4: Ready — always show overview (category cards that link to dedicated pages)
  return <ContentLibraryView company={user} />;
}
