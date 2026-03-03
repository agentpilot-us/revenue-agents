import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { isDemoAccount } from '@/lib/demo/is-demo-account';
import { runResearchPipeline, type PipelineProgress } from '@/lib/research/run-research-pipeline';

export const maxDuration = 120;

/**
 * POST /api/companies/[companyId]/research/run
 *
 * Deterministic research pipeline with SSE progress streaming.
 * Replaces the previous agentic streamText loop.
 *
 * Sequence: discover → enrich (parallel) → save.
 * Total LLM calls: 1 (discover) + N (enrich) ≈ 5–7, down from 18–26.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: session.user.id },
      select: { id: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (await isDemoAccount(companyId)) {
      return NextResponse.json({ error: 'Demo account is locked.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const userGoal =
      typeof body.userGoal === 'string' ? body.userGoal.trim() || null : null;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function sendEvent(event: PipelineProgress) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          } catch {
            // stream closed
          }
        }

        const result = await runResearchPipeline({
          companyId,
          userId: session.user.id,
          userGoal,
          onProgress: sendEvent,
        });

        if (!result.ok) {
          sendEvent({ step: 'error', message: result.error });
        }

        try {
          controller.close();
        } catch {
          // already closed
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('POST /api/companies/[companyId]/research/run error:', error);
    const message = error instanceof Error ? error.message : 'Research run failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
