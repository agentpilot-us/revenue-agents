import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getCompanySetupState } from '@/app/actions/content-library-setup';
import { ContentLibraryView } from '@/app/components/content-library/ContentLibraryView';

export default async function ContentLibraryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const setup = await getCompanySetupState();
  if (!setup.ok) {
    redirect('/login');
  }

  const { state, user } = setup;

  if (state === 'needs_company_info') {
    redirect('/dashboard/company-setup');
  }

  return <ContentLibraryView company={user} />;
}
