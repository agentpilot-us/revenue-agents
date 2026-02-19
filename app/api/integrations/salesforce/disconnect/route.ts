import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clear Salesforce tokens for the current user
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        salesforceAccessToken: null,
        salesforceRefreshToken: null,
        salesforceInstanceUrl: null,
        salesforceTokenExpiresAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Salesforce disconnect error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect Salesforce' },
      { status: 500 }
    );
  }
}
