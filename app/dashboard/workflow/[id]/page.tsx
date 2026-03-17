import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

/**
 * Legacy /dashboard/workflow/[id]. ActionWorkflows are deprecated.
 * If [id] is a PlayRun for the user, redirect to the run page; otherwise to My Day.
 */
export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  const run = await prisma.playRun.findFirst({
    where: { id, userId: session.user.id },
    select: { companyId: true },
  });
  if (run) {
    redirect(`/dashboard/companies/${run.companyId}/plays/run/${id}`);
  }

  redirect('/dashboard');
}
