import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generatePptxBuffer } from '@/lib/export/generate-pptx';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, companyName, slides } = body as {
      title?: string;
      companyName?: string;
      slides?: Array<{ title: string; bullets: string[]; speakerNotes?: string }>;
    };

    if (!title || !Array.isArray(slides) || slides.length === 0) {
      return NextResponse.json(
        { error: 'title and a non-empty slides array are required' },
        { status: 400 }
      );
    }

    for (const slide of slides) {
      if (!slide.title || !Array.isArray(slide.bullets)) {
        return NextResponse.json(
          { error: 'Each slide must have a title and bullets array' },
          { status: 400 }
        );
      }
    }

    const buffer = await generatePptxBuffer({ title, companyName, slides });

    const safeName = title
      .replace(/[^a-zA-Z0-9 _-]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 80);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${safeName || 'presentation'}.pptx"`,
      },
    });
  } catch (error) {
    console.error('PPTX export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate presentation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
