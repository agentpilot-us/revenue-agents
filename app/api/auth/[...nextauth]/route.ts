import { NextRequest } from 'next/server';
import { handlers } from '@/auth';

/**
 * Next.js 16 / Turbopack can pass a Request whose URL pathname is not the full
 * catch-all path (e.g. only /api/auth), so Auth.js parses the wrong action and
 * throws UnknownAction. Rebuild the request URL from route params so the path
 * is /api/auth/signin/google (etc.).
 */
async function withFixedUrl(
  method: 'GET' | 'POST',
  request: NextRequest,
  context: { params: Promise<{ nextauth?: string[] }> }
) {
  const params = await context.params;
  const segments = params.nextauth ?? [];
  const path = `/api/auth/${segments.join('/')}`;
  const incoming = new URL(request.url);
  // Always rebuild URL from origin + path + search so Auth.js sees the full path.
  const fixedUrl = `${incoming.origin}${path}${incoming.search}`;
  const fixedRequest = new NextRequest(fixedUrl, {
    method: request.method,
    headers: request.headers,
    ...(request.method === 'POST' && request.body != null && { body: request.body }),
  });
  return method === 'GET' ? handlers.GET(fixedRequest) : handlers.POST(fixedRequest);
}

export const GET = (req: NextRequest, ctx: { params: Promise<{ nextauth?: string[] }> }) =>
  withFixedUrl('GET', req, ctx);
export const POST = (req: NextRequest, ctx: { params: Promise<{ nextauth?: string[] }> }) =>
  withFixedUrl('POST', req, ctx);

export const runtime = 'nodejs';
