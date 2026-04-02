import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/security/rate-limiter';
import {
  normalizeDomain,
  resolveStradexLeadServiceUserId,
  createOrReuseLeadCompany,
  runStradexLeadBackgroundJobs,
  sendStradexLeadConfirmationEmail,
  sendStradexLeadDuplicateInterestEmail,
  type StradexLeadPayload,
} from '@/lib/stradex/lead-brief';

export const maxDuration = 300;

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  company: z.string().trim().min(1).max(200),
  target_account: z.string().trim().min(1).max(300),
  target_domain: z.string().trim().min(1).max(253),
  target_industry: z.string().trim().max(200).optional(),
  product_focus: z.string().trim().max(500).optional(),
  priority_buyer: z.string().trim().max(500).optional(),
  challenge: z.string().trim().max(4000).optional(),
  /** Honeypot — must be empty */
  website: z.string().optional(),
});

function clientIp(req: NextRequest): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip') || 'unknown';
}

function allowedOriginsList(): string[] {
  const raw = process.env.STRADEX_LEAD_ALLOWED_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
  if (raw.length > 0) return raw;
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, '') ?? '';
  return base ? [base] : [];
}

function isOriginAllowed(req: NextRequest, secretOk: boolean): boolean {
  if (secretOk) return true;
  const allowed = allowedOriginsList();
  if (allowed.length === 0 && process.env.NODE_ENV === 'development') {
    return true;
  }
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  if (origin && allowed.some((a) => origin === a || origin.startsWith(a))) return true;
  if (referer && allowed.some((a) => referer.startsWith(a + '/') || referer === a)) return true;
  return false;
}

function verifyBearerSecret(req: NextRequest): boolean {
  const secret = process.env.STRADEX_LEAD_BRIEF_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  const header = req.headers.get('x-stradex-lead-secret');
  return token === secret || header === secret;
}

function corsHeaders(req: NextRequest): HeadersInit {
  const origin = req.headers.get('origin');
  const allowed = allowedOriginsList();
  if (origin && (allowed.includes(origin) || allowed.some((a) => origin.startsWith(a)))) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-stradex-lead-secret',
    };
  }
  return {};
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req);
  const secretOk = verifyBearerSecret(req);
  if (!isOriginAllowed(req, secretOk)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers });
  }

  const maxReq = parseInt(process.env.STRADEX_LEAD_BRIEF_MAX_PER_IP ?? '5', 10);
  const windowSec = parseInt(process.env.STRADEX_LEAD_BRIEF_WINDOW_SECONDS ?? '3600', 10);
  const ip = clientIp(req);
  const rl = await checkRateLimit(`stradex-lead:${ip}`, 'ip', maxReq, windowSec);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429, headers: { ...headers, 'Retry-After': String(Math.ceil((rl.resetAt.getTime() - Date.now()) / 1000)) } }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400, headers }
    );
  }

  const body = parsed.data;
  if (body.website && body.website.trim().length > 0) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400, headers });
  }

  const domain = normalizeDomain(body.target_domain);
  if (!domain) {
    return NextResponse.json({ error: 'Invalid target domain' }, { status: 400, headers });
  }

  const userId = await resolveStradexLeadServiceUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'Lead intake is not configured (STRADEX_LEAD_BRIEF_USER_ID or STRADEX_LEAD_BRIEF_USER_EMAIL).' },
      { status: 503, headers }
    );
  }

  const payload: StradexLeadPayload = {
    name: body.name,
    email: body.email,
    company: body.company,
    target_account: body.target_account,
    target_domain: body.target_domain,
    target_industry: body.target_industry,
    product_focus: body.product_focus,
    priority_buyer: body.priority_buyer,
    challenge: body.challenge,
  };

  try {
    const { companyId, reused } = await createOrReuseLeadCompany(userId, payload, domain);

    after(() => {
      runStradexLeadBackgroundJobs(companyId, userId, reused).catch((e) =>
        console.error('[stradex-brief] after() job failed:', e)
      );
    });

    if (reused) {
      await sendStradexLeadDuplicateInterestEmail(body.email, body.target_account);
    } else {
      await sendStradexLeadConfirmationEmail(body.email, body.target_account);
    }

    return NextResponse.json(
      {
        ok: true,
        companyId,
        duplicate: reused,
        message: reused
          ? 'We already have this account on file for a brief; our team will follow up if needed.'
          : 'Thanks — your brief is in the queue.',
      },
      { headers }
    );
  } catch (e) {
    console.error('[stradex-brief] POST error:', e);
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500, headers });
  }
}
