import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import PlayRunExecuteClient from './PlayRunExecuteClient';

export default async function PlayRunPage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const { id: companyId, runId } = await params;

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true, name: true },
  });
  if (!company) redirect('/dashboard');

  const run = await prisma.playRun.findFirst({
    where: { id: runId, userId: session.user.id, companyId },
    select: { id: true },
  });
  if (!run) redirect(`/dashboard/companies/${companyId}`);

  return (
    <PlayRunExecuteClient
      companyId={companyId}
      companyName={company.name}
      runId={runId}
    />
  );
}
