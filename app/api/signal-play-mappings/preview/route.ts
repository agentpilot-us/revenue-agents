import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { resolveSignalToPlayCandidate, type SignalInput } from '@/lib/plays/match-signal-to-play';
import { z } from 'zod';

const bodySchema = z.object({
  companyId: z.string().min(1),
  signalType: z.string().min(1),
});

/**
 * POST /api/signal-play-mappings/preview
 * Dry-run: which play template would match for this signal type and account (no PlayRun created).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }

    const { companyId, signalType } = parsed.data;
    const userId = session.user.id;

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId },
      select: { id: true, name: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const signal: SignalInput = {
      id: 'dry-run-preview',
      companyId,
      userId,
      type: signalType,
      title: 'Signal preview',
      summary: '',
      relevanceScore: 0,
      suggestedPlay: null,
    };

    const preview = await resolveSignalToPlayCandidate(signal);

    return NextResponse.json({
      companyName: company.name,
      preview,
      wouldCreatePlayRun: preview.candidate !== null,
    });
  } catch (e) {
    console.error('POST /api/signal-play-mappings/preview:', e);
    return NextResponse.json({ error: 'Preview failed' }, { status: 500 });
  }
}
