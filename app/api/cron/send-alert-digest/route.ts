/**
 * GET /api/cron/send-alert-digest
 * Daily cron: send alert digest emails to users who chose "daily digest".
 * Secure with CRON_SECRET (Bearer in Authorization or query secret).
 */
import { NextRequest, NextResponse } from 'next/server';
import { sendDailyDigests } from '@/lib/alerts/digest';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7) === secret;
  return req.nextUrl.searchParams.get('secret') === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendDailyDigests();
    return NextResponse.json({
      ok: true,
      usersProcessed: result.usersProcessed,
      emailsSent: result.emailsSent,
    });
  } catch (e) {
    console.error('Cron send-alert-digest error:', e);
    return NextResponse.json({ error: 'Digest failed' }, { status: 500 });
  }
}
