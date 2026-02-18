import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/db';
import { ingestContentLibraryChunks } from '@/lib/content-library-rag';

// Vercel serverless body limit is 4.5 MB; keep under that for uploads through the API route
const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let fullText: string;
    let fileName: string;
    let mimeType: string;
    let blobUrl: string | null = null;

    const contentType = req.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      const title = typeof body.title === 'string' ? body.title.trim() : 'Pasted content';
      if (!text) {
        return NextResponse.json({ error: 'text is required for JSON body' }, { status: 400 });
      }
      fullText = text.slice(0, 500_000);
      fileName = title.slice(0, 200);
      mimeType = 'text/plain';
    } else {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: 'Missing or invalid file' }, { status: 400 });
      }
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: `File too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB)` },
          { status: 400 }
        );
      }
      mimeType = file.type;
      fileName = (file.name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);

      if (mimeType === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const { extractText, getDocumentProxy } = await import('unpdf');
        const pdf = await getDocumentProxy(data);
        const { text } = await extractText(pdf, { mergePages: true });
        fullText = (text ?? '').trim().slice(0, 500_000);
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const mammoth = await import('mammoth');
        // mammoth Node API expects path, buffer, or file — not arrayBuffer
        const result = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) });
        fullText = (result.value ?? '').trim().slice(0, 500_000);
      } else if (
        mimeType === 'text/plain' ||
        mimeType === 'text/markdown' ||
        mimeType.startsWith('text/')
      ) {
        fullText = (await file.text()).trim().slice(0, 500_000);
      } else {
        return NextResponse.json(
          {
            error: 'Unsupported file type. Use PDF, TXT, Markdown, or DOCX.',
          },
          { status: 400 }
        );
      }

      if (!fullText.length) {
        return NextResponse.json(
          { error: 'No text could be extracted from the file' },
          { status: 400 }
        );
      }

      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(
          `content-library/${session.user.id}/${Date.now()}-${fileName}`,
          file,
          { access: 'public', addRandomSuffix: true }
        );
        blobUrl = blob.url;
      }
    }

    const contentPayload = {
      blobUrl: blobUrl ?? undefined,
      fullText,
      fileName,
      mimeType,
    };

    const row = await prisma.contentLibrary.create({
      data: {
        userId: session.user.id,
        productId: null,
        title: fileName,
        type: 'UploadedDocument',
        content: contentPayload,
        sourceUrl: blobUrl ?? null,
        userConfirmed: true,
        scrapedAt: null,
      },
      select: { id: true, title: true, type: true },
    });

    try {
      await ingestContentLibraryChunks(row.id, fullText);
    } catch (e) {
      console.error('RAG ingest failed for upload', row.id, e);
    }

    return NextResponse.json({ content: row }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Content library upload error:', error);
    return NextResponse.json(
      {
        error: message,
        details: message,
      },
      { status: 500 }
    );
  }
}
