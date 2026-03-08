import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import PlayExecuteClient from './PlayExecuteClient';

export default async function PlayExecutePage({
  params,
}: {
  params: Promise<{ id: string; workflowId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const { id: companyId, workflowId } = await params;

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true, name: true },
  });
  if (!company) redirect('/dashboard');

  const workflow = await prisma.actionWorkflow.findFirst({
    where: { id: workflowId, userId: session.user.id, companyId },
    select: { id: true },
  });
  if (!workflow) redirect(`/dashboard/companies/${companyId}`);

  return (
    <PlayExecuteClient
      companyId={companyId}
      companyName={company.name}
      workflowId={workflowId}
    />
  );
}
