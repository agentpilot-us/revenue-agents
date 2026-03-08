// app/dashboard/companies/[id]/plays/run/page.tsx
//
// Resolves playId/signalId → PlaybookTemplate, assembles a workflow via the
// template path, and redirects to the execute page.
// Falls back to PlayRunClient if no template can be resolved.

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { assembleWorkflow } from '@/lib/action-workflows/assemble';
import { PlayRunClient } from './PlayRunClient';

type SearchParams = {
  playId?: string;
  templateId?: string;
  signalId?: string;
  signalTitle?: string;
  signalSummary?: string;
  segmentId?: string;
  segmentName?: string;
  autoRun?: string;
};

export default async function PlayRunPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const { id: companyId } = await params;
  const sp = await searchParams;

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    select: { id: true, name: true },
  });
  if (!company) redirect('/dashboard');

  // Resolve a PlaybookTemplate to use
  let templateId = sp.templateId;

  if (!templateId) {
    const nameHint = sp.playId;

    // If there's a signal, check its suggestedPlay
    let signalHint: string | null = null;
    if (sp.signalId) {
      const signal = await prisma.accountSignal.findFirst({
        where: { id: sp.signalId, companyId, userId: session.user.id },
        select: { suggestedPlay: true },
      });
      signalHint = signal?.suggestedPlay ?? null;
    }

    const searchTerm = nameHint || signalHint;
    if (searchTerm) {
      const template = await prisma.playbookTemplate.findFirst({
        where: {
          userId: session.user.id,
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { triggerType: searchTerm },
          ],
        },
        select: { id: true },
        orderBy: { priority: 'desc' },
      });
      templateId = template?.id;
    }

    // Fallback to highest-priority template
    if (!templateId) {
      const fallback = await prisma.playbookTemplate.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
        orderBy: { priority: 'desc' },
      });
      templateId = fallback?.id;
    }
  }

  if (templateId) {
    try {
      const workflow = await assembleWorkflow({
        userId: session.user.id,
        companyId,
        templateId,
        accountSignalId: sp.signalId || undefined,
        targetDivisionId: sp.segmentId || undefined,
      });
      redirect(`/dashboard/companies/${companyId}/plays/execute/${workflow.id}`);
    } catch (e) {
      console.error('Failed to assemble workflow from template, falling back to legacy:', e);
    }
  }

  const resolvedParams = {
    playId: sp.playId,
    signalId: sp.signalId,
    signalTitle: sp.signalTitle,
    signalSummary: sp.signalSummary,
    segmentId: sp.segmentId,
    segmentName: sp.segmentName,
    autoRun: sp.autoRun === 'true',
  };

  return (
    <PlayRunClient
      companyId={companyId}
      companyName={company.name}
      runParams={resolvedParams}
    />
  );
}
