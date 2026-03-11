import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await prisma.account.deleteMany({
      where: {
        userId: session.user.id,
        provider: 'google-workspace',
      },
    });

    return NextResponse.json({
      ok: true,
      deleted: result.count,
    });
  } catch (error) {
    console.error('DELETE /api/integrations/google-workspace/disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Google Workspace' },
      { status: 500 },
    );
  }
}
