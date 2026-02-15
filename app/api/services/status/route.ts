import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isServiceConfigured } from '@/lib/service-config';

/**
 * GET /api/services/status
 * Returns which optional services are configured (for UI to show setup prompts).
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      firecrawl: isServiceConfigured('firecrawl'),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
