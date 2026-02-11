import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const framework = await prisma.messagingFramework.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!framework) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let file: File;
  try {
    const formData = await req.formData();
    const f = formData.get('file');
    if (!f || !(f instanceof File)) {
      return NextResponse.json({ error: 'Missing or invalid file' }, { status: 400 });
    }
    if (f.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }
    file = f;
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(data);
    const { text } = await extractText(pdf, { mergePages: true });
    const fullText = (text ?? '').trim();

    if (!fullText.length) {
      return NextResponse.json(
        { error: 'No text could be extracted from the PDF' },
        { status: 400 }
      );
    }

    const updatedContent = fullText.slice(0, 50_000);
    await prisma.messagingFramework.update({
      where: { id },
      data: { content: updatedContent },
    });

    return NextResponse.json({
      ok: true,
      message: 'PDF text imported into framework content.',
      content: updatedContent,
    });
  } catch (e) {
    let message = 'Failed to ingest PDF';
    if (e instanceof Error) {
      message = e.message;
      // Unwrap common API/Prisma error shapes
      const err = e as Error & { cause?: { message?: string }; error?: { message?: string } };
      if (err.cause?.message) message = err.cause.message;
      else if (err.error?.message) message = err.error.message;
    }
    console.error('Ingest PDF error:', e);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
