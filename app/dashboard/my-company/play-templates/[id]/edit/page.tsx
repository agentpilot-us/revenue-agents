import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import PlayTemplateBuilder from '@/app/components/plays/PlayTemplateBuilder';

type Search = Promise<{ returnTo?: string }>;

export default async function EditPlayTemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Search;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  const { id } = await params;
  const sp = await searchParams;

  const exists = await prisma.playTemplate.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!exists) {
    notFound();
  }

  return (
    <PlayTemplateBuilder
      mode="edit"
      templateId={id}
      context={{ returnTo: sp.returnTo }}
    />
  );
}
