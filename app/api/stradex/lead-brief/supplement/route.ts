import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/security/rate-limiter';
import {
  applyStradexLeadSupplement,
  resolveStradexLeadServiceUserId,
} from '@/lib/stradex/lead-brief';

const bodySchema = z.object({
  companyId: z.string().trim().min(1).max(40),
  email: z.string().trim().email().max(320),
  product_focus: z.string().trim().max(500).optional(),
  priority_buyer: z.string().trim().max(500).optional(),
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

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400, headers });
  }
  const body = parsed.data;
  if (body.website && body.website.trim().length > 0) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400, headers });
  }

  const windowSec = parseInt(process.env.STRADEX_LEAD_BRIEF_WINDOW_SECONDS ?? '3600', 10);
  const maxPerEmail = parseInt(process.env.STRADEX_LEAD_SUPPLEMENT_MAX_PER_EMAIL ?? '10', 10);
  const maxPerIp = parseInt(process.env.STRADEX_LEAD_SUPPLEMENT_MAX_PER_IP ?? '40', 10);
  const emailNorm = body.email.trim().toLowerCase();
  const ip = clientIp(req);

  const rlEmail = await checkRateLimit(`stradex-supplement:${emailNorm}`, 'user', maxPerEmail, windowSec);
  if (!rlEmail.allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers });
  }
  const rlIp = await checkRateLimit(`stradex-supplement-ip:${ip}`, 'ip', maxPerIp, windowSec);
  if (!rlIp.allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers });
  }

  const userId = await resolveStradexLeadServiceUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503, headers });
  }

  const result = await applyStradexLeadSupplement({
    companyId: body.companyId,
    submitterEmail: body.email,
    serviceUserId: userId,
    product_focus: body.product_focus,
    priority_buyer: body.priority_buyer,
  });

  if (!result.ok) {
    const status = result.error === 'Not found' ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status, headers });
  }
  return NextResponse.json({ ok: true, message: 'Details saved. Thanks!' }, { headers });
}
