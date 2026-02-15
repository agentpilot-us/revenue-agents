import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ApprovalQueueClient } from './ApprovalQueueClient';

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const [pendingActions, recentActivity] = await Promise.all([
    prisma.pendingAction.findMany({
      where: { userId: session.user.id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true } },
        contact: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    }),
    prisma.activity.findMany({
      where: {
        userId: session.user.id,
        type: { in: ['Email', 'Meeting'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        company: { select: { id: true, name: true } },
        contact: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    }),
  ]);

  const serializedPending = pendingActions.map((i) => ({
    id: i.id,
    type: i.type,
    status: i.status,
    payload: i.payload as Record<string, unknown>,
    comment: i.comment,
    createdAt: i.createdAt.toISOString(),
    company: i.company,
    contact: i.contact,
  }));

  const serializedActivity = recentActivity.map((a) => ({
    id: a.id,
    type: a.type,
    summary: a.summary,
    content: a.content,
    subject: a.subject,
    companyId: a.companyId,
    contactId: a.contactId,
    createdAt: a.createdAt.toISOString(),
    company: a.company,
    contact: a.contact,
    agentUsed: a.agentUsed,
  }));

  return (
    <div className="min-h-screen bg-zinc-900 text-slate-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-white mb-2">Approval history</h1>
        <p className="text-slate-400 mb-8">
          Approvals happen in chat. This page shows history of emails sent and meetings scheduled by the agent.
        </p>
        <ApprovalQueueClient
          initialPendingItems={serializedPending}
          initialActivityItems={serializedActivity}
        />
      </div>
    </div>
  );
}
