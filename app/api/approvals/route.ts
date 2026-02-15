import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId') ?? undefined;
    const status = searchParams.get('status') ?? undefined; // pending | approved | rejected
    const countOnly = searchParams.get('countOnly') === 'true';

    const where: { userId: string; companyId?: string; status?: string } = {
      userId: session.user.id,
    };
    if (companyId) where.companyId = companyId;
    if (status) where.status = status;

    if (countOnly) {
      const count = await prisma.pendingAction.count({
        where: { ...where, status: 'pending' },
      });
      return NextResponse.json({ count });
    }

    const [pendingItems, activityItems] = await Promise.all([
      prisma.pendingAction.findMany({
        where: { ...where, status: 'pending' },
        orderBy: { createdAt: 'desc' },
        include: {
          company: { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.activity.findMany({
        where: {
          userId: session.user.id,
          type: { in: ['Email', 'Meeting'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          company: { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
    ]);

    return NextResponse.json({
      pendingItems: pendingItems.map((i) => ({
        id: i.id,
        type: i.type,
        status: i.status,
        payload: i.payload as Record<string, unknown>,
        comment: i.comment,
        createdAt: i.createdAt.toISOString(),
        company: i.company,
        contact: i.contact,
      })),
      activityItems: activityItems.map((a) => ({
        id: a.id,
        type: a.type,
        summary: a.summary,
        content: a.content,
        subject: a.subject,
        companyId: a.companyId,
        contactId: a.contactId,
        createdAt: a.createdAt.toISOString(),
        company: a.company,
        contact: a.contact,
        agentUsed: a.agentUsed,
      })),
    });
  } catch (e) {
    console.error('GET /api/approvals', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
