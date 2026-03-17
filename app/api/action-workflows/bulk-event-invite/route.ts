import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/action-workflows/bulk-event-invite
 * Deprecated. Event flows now create PlayRuns via events/[eventName]/activate.
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error: 'bulk-event-invite is deprecated. Use event activation (PlayRun) instead.',
      migration: 'PlayRun',
    },
    { status: 410 },
  );
}
