import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { personaUpdateBodySchema } from '@/lib/personas/persona-schemas';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ personaId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const { personaId } = await params;

  const persona = await prisma.persona.findFirst({
    where: { id: personaId, userId },
  });

  if (!persona) {
    return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
  }

  return NextResponse.json(persona);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ personaId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const { personaId } = await params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = personaUpdateBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const raw = parsed.data;
  const data = Object.fromEntries(
    Object.entries(raw).filter(([, v]) => v !== undefined),
  );
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const owned = await prisma.persona.findFirst({
    where: { id: personaId, userId },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
  }

  try {
    const persona = await prisma.persona.update({
      where: { id: personaId },
      data: data as typeof raw,
    });
    return NextResponse.json(persona);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
    }
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'A persona with this name already exists' },
        { status: 409 },
      );
    }
    throw error;
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ personaId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const { personaId } = await params;

  const owned = await prisma.persona.findFirst({
    where: { id: personaId, userId },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
  }

  await prisma.persona.delete({
    where: { id: personaId },
  });
  return NextResponse.json({ ok: true });
}
