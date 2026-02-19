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
    if (!isServiceConfigured('resend')) {
      return NextResponse.json({ ok: false, error: 'Resend is not configured' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'API key not found' }, { status: 500 });
    }

    // Test by fetching domains (lightweight API call)
    const response = await fetch('https://api.resend.com/domains', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
    console.error('Resend test error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Test failed',
      },
      { status: 500 }
    );
  }
}
