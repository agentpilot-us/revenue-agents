import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { DepartmentType } from '@prisma/client';
import { personaCreateBodySchema } from '@/lib/personas/persona-schemas';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const departmentType = searchParams.get('department') as DepartmentType | null;

  const personas = await prisma.persona.findMany({
    where: {
      userId,
      ...(departmentType
        ? {
            OR: [
              { primaryDepartment: departmentType },
              { secondaryDepartments: { has: departmentType } },
            ],
          }
        : {}),
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(personas);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = personaCreateBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const persona = await prisma.persona.create({
      data: {
        userId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        includeTitles: parsed.data.includeTitles,
        excludeTitles: parsed.data.excludeTitles,
        primaryDepartment: parsed.data.primaryDepartment ?? null,
        secondaryDepartments: parsed.data.secondaryDepartments,
        painPoints: parsed.data.painPoints,
        successMetrics: parsed.data.successMetrics,
        contentTypes: parsed.data.contentTypes,
        messagingTone: parsed.data.messagingTone,
        preferredChannels: parsed.data.preferredChannels,
      },
    });
    return NextResponse.json(persona);
  } catch (e: unknown) {
    if (
      e &&
      typeof e === 'object' &&
      'code' in e &&
      (e as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'A persona with this name already exists' },
        { status: 409 },
      );
    }
    throw e;
  }
}
