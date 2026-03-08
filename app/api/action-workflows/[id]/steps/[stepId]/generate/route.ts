import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateStepContent } from '@/lib/action-workflows/generate-step-content';

export const maxDuration = 120;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, stepId } = await params;

    const step = await generateStepContent({
      workflowId: id,
      stepId,
      userId: session.user.id,
    });

    return NextResponse.json({ step });
  } catch (error) {
    console.error('POST /api/action-workflows/[id]/steps/[stepId]/generate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 },
    );
  }
}
