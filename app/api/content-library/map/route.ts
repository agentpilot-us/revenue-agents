import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { mapUrl } from '@/lib/tools/firecrawl';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { url?: string; limit?: number; search?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const url = typeof body.url === 'string' ? body.url.trim() : '';
    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    const baseUrl = url.startsWith('http') ? url : `https://${url}`;
    const result = await mapUrl({
      url: baseUrl,
      limit: typeof body.limit === 'number' ? Math.min(body.limit, 1000) : 500,
      search: typeof body.search === 'string' ? body.search : undefined,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: 503 }
      );
    }

    return NextResponse.json({ links: result.links });
  } catch (error) {
    console.error('Content library map error:', error);
    return NextResponse.json(
      { error: 'Failed to discover links' },
      { status: 500 }
    );
  }
}
