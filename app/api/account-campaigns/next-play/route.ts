import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getNextBestPlays } from '@/lib/dashboard/next-best-plays';

/**
 * GET /api/account-campaigns/next-play?companyId=xxx&limit=1
 *
 * Lightweight wrapper around the next-best-plays recommender
 * used by OutcomeSelector to suggest the next play inline.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = req.nextUrl.searchParams.get('companyId');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '3', 10);

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const plays = await getNextBestPlays(session.user.id, companyId, limit);

    return NextResponse.json({
      plays: plays.map((p) => ({
        templateId: p.templateId,
        templateName: p.templateName,
        expectedOutcome: p.expectedOutcome,
        reasons: p.reasons,
        targetDivision: p.targetDivision
          ? { id: p.targetDivision.id, name: p.targetDivision.name }
          : null,
        stepPreview: p.stepPreview,
        score: p.score,
      })),
    });
  } catch (error) {
    console.error('GET /api/account-campaigns/next-play error:', error);
    return NextResponse.json({ error: 'Failed to get recommendations' }, { status: 500 });
  }
}
