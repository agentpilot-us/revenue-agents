import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = req.nextUrl.searchParams.get('companyId');
    const includeGlobal = req.nextUrl.searchParams.get('includeGlobal') === '1';

    if (companyId && includeGlobal) {
      const rows = await prisma.customSignalConfig.findMany({
        where: {
          userId: session.user.id,
          OR: [{ companyId }, { companyId: null }],
        },
        orderBy: { createdAt: 'desc' },
      });
      const configs = rows.map((r) => ({
        ...r,
        scope: r.companyId ? 'company' as const : 'global' as const,
      }));
      return NextResponse.json({ configs });
    }

    const configs = await prisma.customSignalConfig.findMany({
      where: {
        userId: session.user.id,
        ...(companyId ? { companyId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      configs: configs.map((r) => ({
        ...r,
        scope: r.companyId ? 'company' as const : 'global' as const,
      })),
    });
  } catch (error) {
    console.error('GET /api/signals/config error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list configs' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, type, companyId, config, isActive } = body;

    if (!name || !type || !config) {
      return NextResponse.json(
        { error: 'name, type, and config are required' },
        { status: 400 }
      );
    }

    if (companyId) {
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId: session.user.id },
        select: { id: true },
      });
      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }
    }

    const created = await prisma.customSignalConfig.create({
      data: {
        userId: session.user.id,
        name,
        type,
        companyId: companyId ?? null,
        config,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ config: created }, { status: 201 });
  } catch (error) {
    console.error('POST /api/signals/config error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create config' },
      { status: 500 }
    );
  }
}
