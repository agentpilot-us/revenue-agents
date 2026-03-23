import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import PlayCatalog from '@/app/components/plays/PlayCatalog';

export default async function PlaysPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; divisionId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const params = await searchParams;
  const companyId = params.companyId?.trim() || undefined;
  const divisionId = params.divisionId?.trim() || undefined;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 80px' }}>
      <PlayCatalog initialCompanyId={companyId} initialDivisionId={divisionId} />
    </div>
  );
}
