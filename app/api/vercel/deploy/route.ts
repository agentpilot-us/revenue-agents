/**
 * Optional API route for Vercel deployments (e.g. rate limiting, audit).
 * Chat tools can call deployStaticPage directly; this route is for external or future use.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { deployStaticPage } from '@/lib/vercel/deploy-static';
import { checkRateLimit, getRateLimitConfig } from '@/lib/security/rate-limiter';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitConfig = getRateLimitConfig('user');
  const result = await checkRateLimit(
    `vercel-deploy:${session.user.id}`,
    'user',
    rateLimitConfig.maxRequests,
    rateLimitConfig.windowSeconds
  );
  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many deployment requests' },
      { status: 429 }
    );
  }

  let body: { name?: string; files?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const name = body.name ?? 'deployment';
  const files = body.files ?? {};
  if (Object.keys(files).length === 0) {
    return NextResponse.json(
      { error: 'At least one file is required' },
      { status: 400 }
    );
  }

  const deployResult = await deployStaticPage({
    name,
    files,
    teamId: process.env.VERCEL_TEAM_ID ?? undefined,
    projectId: process.env.VERCEL_PROJECT_ID ?? undefined,
  });

  if (deployResult.error) {
    return NextResponse.json(
      { error: deployResult.error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    url: deployResult.url,
    id: deployResult.deploymentId,
    readyState: deployResult.readyState,
  });
}
