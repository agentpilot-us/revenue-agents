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
    if (!isServiceConfigured('cal')) {
      return NextResponse.json({ ok: false, error: 'Cal.com is not configured' }, { status: 400 });
    }

    const apiKey = process.env.CAL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'API key not found' }, { status: 500 });
    }

    // Test by fetching user info (lightweight API call)
    const url = new URL('https://api.cal.com/v1/me');
    url.searchParams.set('apiKey', apiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      return NextResponse.json({
        ok: false,
        error: error.message || `API returned ${response.status}`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Cal.com test error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Test failed',
      },
      { status: 500 }
    );
  }
}
