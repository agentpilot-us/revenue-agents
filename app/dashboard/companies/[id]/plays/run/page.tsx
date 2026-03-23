// app/dashboard/companies/[id]/plays/run/page.tsx
//
// Resolves playId/signalId/templateId → PlayTemplate, creates a PlayRun, and
// redirects to the run page. Falls back to PlayRunClient (catalog picker) if no template.

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import type { PlayTriggerType } from '@prisma/client';
import { createPlayRunFromTemplate } from '@/lib/plays/create-play-run';
import { myDayUrlAfterPlayStart } from '@/lib/dashboard/my-day-navigation';
import { PlayRunClient } from './PlayRunClient';

const PLAY_TRIGGER_VALUES: PlayTriggerType[] = ['TIMELINE', 'MANUAL', 'SIGNAL'];

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

  // Resolve PlayTemplate: templateId, or playId/suggestedPlay → name/slug/triggerType, or first ACTIVE
  let playTemplateId = sp.templateId;

  if (!playTemplateId) {
    const nameHint = sp.playId;
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
      const triggerMatch =
        PLAY_TRIGGER_VALUES.includes(searchTerm.toUpperCase() as PlayTriggerType)
          ? ({ triggerType: searchTerm.toUpperCase() as PlayTriggerType } as const)
          : undefined;
      const template = await prisma.playTemplate.findFirst({
        where: {
          userId: session.user.id,
          status: 'ACTIVE',
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { slug: searchTerm },
            ...(triggerMatch ? [triggerMatch] : []),
          ],
        },
        select: { id: true },
      });
      playTemplateId = template?.id ?? undefined;
    }
    if (!playTemplateId) {
      const fallback = await prisma.playTemplate.findFirst({
        where: { userId: session.user.id, status: 'ACTIVE' },
        select: { id: true },
      });
      playTemplateId = fallback?.id ?? undefined;
    }
  }

  if (playTemplateId) {
    try {
      const playRun = await createPlayRunFromTemplate({
        userId: session.user.id,
        companyId,
        playTemplateId,
        accountSignalId: sp.signalId ?? null,
      });
      redirect(myDayUrlAfterPlayStart(playRun.id, companyId));
    } catch (e) {
      console.error('Failed to create play run from template, falling back to catalog:', e);
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
