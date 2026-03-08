import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { executeStep } from '@/lib/action-workflows/execute-step';

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

    const result = await executeStep({
      workflowId: id,
      stepId,
      userId: session.user.id,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, channel: result.channel },
        { status: 400 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/action-workflows/[id]/steps/[stepId]/send error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Send failed' },
      { status: 500 },
    );
  }
}
