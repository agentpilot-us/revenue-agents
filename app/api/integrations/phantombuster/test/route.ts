import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isServiceConfigured } from '@/lib/service-config';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only test if service is configured (don't leak key presence)
    if (!isServiceConfigured('phantombuster')) {
      return NextResponse.json(
        { ok: false, error: 'PhantomBuster is not configured' },
        { status: 400 }
      );
    }

    const apiKey = process.env.PHANTOMBUSTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'API key not found' }, { status: 500 });
    }

    // Test by fetching user info or agents list (lightweight API call)
    // PhantomBuster API endpoint for user info
    const response = await fetch('https://api.phantombuster.com/api/v2/agents/fetch-all', {
      headers: {
        'X-Phantombuster-Key': apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      return NextResponse.json({
        ok: false,
        error: error.message || `API returned ${response.status}`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PhantomBuster test error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Test failed',
      },
      { status: 500 }
    );
  }
}
