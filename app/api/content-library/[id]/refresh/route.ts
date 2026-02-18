import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { refreshContentLibraryItem } from '@/lib/content-library/refresh-url';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: contentLibraryId } = await params;
    if (!contentLibraryId) {
      return NextResponse.json({ error: 'Missing content id' }, { status: 400 });
    }

    const result = await refreshContentLibraryItem(contentLibraryId, session.user.id);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === 'Content not found' ? 404 : result.error === 'No source URL to refresh' ? 400 : 502 }
      );
    }

    return NextResponse.json({ ok: true, title: result.title });
  } catch (error) {
    console.error('Content library refresh error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Refresh failed' },
      { status: 500 }
    );
  }
}
