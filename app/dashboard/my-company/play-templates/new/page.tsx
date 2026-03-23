import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import PlayTemplateBuilder from '@/app/components/plays/PlayTemplateBuilder';

type Search = Promise<{
  companyId?: string;
  companyName?: string;
  returnTo?: string;
}>;

export default async function NewPlayTemplatePage({ searchParams }: { searchParams: Search }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  const sp = await searchParams;
  return (
    <PlayTemplateBuilder
      mode="create"
      context={{
        companyId: sp.companyId,
        companyName: sp.companyName,
        returnTo: sp.returnTo,
      }}
    />
  );
}
