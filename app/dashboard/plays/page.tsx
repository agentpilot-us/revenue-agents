import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import PlayCatalog from '@/app/components/plays/PlayCatalog';

export default async function PlaysPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 80px' }}>
      <PlayCatalog />
    </div>
  );
}
