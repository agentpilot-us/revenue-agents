/**
 * AgentPilot — File Upload + Pasted Text Extraction
 * Both paths run through enrichScrapedContent and return unconfirmed with extraction
 * so the AE sees the same confirmation flow as web scraping.
 */

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma, ContentType } from '@prisma/client';
import { put } from '@vercel/blob';
import {
  enrichScrapedContent,
  type StructuredPageExtraction,
} from '@/lib/content-library/structured-extraction';
import { ingestContentLibraryChunks } from '@/lib/content-library-rag';
import { getChatModel } from '@/lib/llm/get-model';
import { calculateContentHash } from '@/lib/content-library/content-hash';

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB — Vercel body limit

const SUPPORTED_MIME_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'docx',
  'text/plain': 'txt',
  'text/markdown': 'md',
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return handlePastedText(req, userId);
  }

  if (contentType.includes('multipart/form-data')) {
    return handleFileUpload(req, userId);
  }

  return NextResponse.json(
    { error: 'Content-Type must be application/json or multipart/form-data' },
    { status: 400 }
  );
}

async function handlePastedText(req: NextRequest, userId: string) {
  let body: { text?: string; productId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { text, productId } = body;
  if (!text || text.trim().length < 100) {
    return NextResponse.json(
      { error: 'Pasted text is too short to extract signal (minimum 100 characters).' },
      { status: 422 }
    );
  }

  const pseudoUrl = 'upload://Pasted content';

  let extraction: StructuredPageExtraction;
  let contentPayload: Record<string, unknown>;
  let suggestedType: string;

  try {
    ({ extraction, contentPayload, suggestedType } = await enrichScrapedContent(
      pseudoUrl,
      text,
      getChatModel()
    ));
  } catch (e) {
    return NextResponse.json(
      { error: `Extraction failed: ${e instanceof Error ? e.message : 'Unknown error'}` },
      { status: 500 }
    );
  }

  const content = {
    ...contentPayload,
    pastedText: true,
  };

  const row = await prisma.contentLibrary.create({
    data: {
      userId,
      productId: productId ?? null,
      title: extraction.keyMessages[0] ?? 'Pasted content',
      type: suggestedType as ContentType,
      content: content as Prisma.InputJsonValue,
      sourceUrl: pseudoUrl,
      userConfirmed: false,
      scrapedAt: new Date(),
      contentHash: calculateContentHash(content),
      version: '1.0',
    },
  });

  await ingestContentLibraryChunks(row.id, text);

  return NextResponse.json({
    id: row.id,
    title: row.title,
    type: row.type,
    sourceUrl: pseudoUrl,
    extraction,
    userConfirmed: false,
  });
}

async function handleFileUpload(req: NextRequest, userId: string) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const productId = formData.get('productId') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      {
        error:
          `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). ` +
          `Maximum is 4MB on this platform. For larger files, split the document ` +
          `or use the URL scrape path if the content is available online.`,
      },
      { status: 413 }
    );
  }

  const fileType = SUPPORTED_MIME_TYPES[file.type];
  if (!fileType) {
    return NextResponse.json(
      {
        error:
          `Unsupported file type: ${file.type || '(unknown)'}. ` +
          `Supported formats: PDF, DOCX, DOC, TXT, MD`,
      },
      { status: 415 }
    );
  }

  let markdown: string;
  try {
    markdown = await extractTextFromFile(file, fileType);
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to read file: ${e instanceof Error ? e.message : 'Unknown error'}` },
      { status: 422 }
    );
  }

  if (markdown.trim().length < 100) {
    return NextResponse.json(
      {
        error:
          'File has too little readable text to extract signal. ' +
          'If this is a scanned PDF, please use a text-based PDF or paste the content manually.',
      },
      { status: 422 }
    );
  }

  let blobUrl: string | undefined;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(`content-library/${userId}/${Date.now()}-${file.name}`, file, {
        access: 'public',
      });
      blobUrl = blob.url;
    } catch {
      console.warn('[upload] Blob storage failed — continuing without blob URL');
    }
  }

  const pseudoUrl = `upload://${file.name}`;

  let extraction: StructuredPageExtraction;
  let contentPayload: Record<string, unknown>;
  let suggestedType: string;

  try {
    ({ extraction, contentPayload, suggestedType } = await enrichScrapedContent(
      pseudoUrl,
      markdown,
      getChatModel()
    ));
  } catch (e) {
    return NextResponse.json(
      { error: `Extraction failed: ${e instanceof Error ? e.message : 'Unknown error'}` },
      { status: 500 }
    );
  }

  const content = {
    ...contentPayload,
    uploadedFileName: file.name,
    uploadedFileType: fileType,
    uploadedFileSizeBytes: file.size,
    ...(blobUrl && { blobUrl }),
  };

  const row = await prisma.contentLibrary.create({
    data: {
      userId,
      productId: productId ?? null,
      title: extraction.keyMessages[0] ?? file.name,
      type: suggestedType as ContentType,
      content: content as Prisma.InputJsonValue,
      sourceUrl: pseudoUrl,
      userConfirmed: false,
      scrapedAt: new Date(),
      contentHash: calculateContentHash(content),
      version: '1.0',
    },
  });

  await ingestContentLibraryChunks(row.id, markdown);

  return NextResponse.json({
    id: row.id,
    title: row.title,
    type: row.type,
    sourceUrl: pseudoUrl,
    extraction,
    userConfirmed: false,
  });
}

async function extractTextFromFile(file: File, fileType: string): Promise<string> {
  switch (fileType) {
    case 'pdf':
      return extractPdf(file);
    case 'docx':
      return extractDocx(file);
    case 'txt':
    case 'md':
      return file.text();
    default:
      throw new Error(`No extractor for file type: ${fileType}`);
  }
}

async function extractPdf(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(new Uint8Array(bytes));

  let PDFParse: new (opts: { data: Buffer }) => {
    getText: () => Promise<{ text: string }>;
    destroy: () => Promise<void>;
  };
  try {
    const mod = await import('pdf-parse');
    PDFParse = mod.PDFParse as typeof PDFParse;
  } catch {
    throw new Error('pdf-parse is not installed. Run: npm install pdf-parse');
  }

  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    await parser.destroy();
    const text = result?.text?.trim() ?? '';
    if (!text) {
      throw new Error(
        'PDF appears to be scanned or image-based and has no extractable text. ' +
          'Please upload a text-based PDF or paste the content manually.'
      );
    }
    return cleanPdfText(text);
  } catch (e) {
    await parser.destroy().catch(() => {});
    throw e;
  }
}

function cleanPdfText(raw: string): string {
  return raw
    .replace(/\f/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ +$/gm, '')
    .replace(/^\d+\s*$/gm, '')
    .trim();
}

async function extractDocx(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(new Uint8Array(bytes));

  let mammoth: typeof import('mammoth');
  try {
    mammoth = await import('mammoth');
  } catch {
    throw new Error('mammoth is not installed. Run: npm install mammoth');
  }

  // convertToMarkdown preserves structure (headers, lists); mammoth types only declare extractRawText
  const result = await (mammoth as unknown as { convertToMarkdown: (opts: { buffer: Buffer }) => Promise<{ value?: string; messages?: unknown[] }> }).convertToMarkdown({ buffer });

  if (result.messages?.length) {
    console.warn('[upload] DOCX extraction warnings:', result.messages);
  }

  const markdown = result.value?.trim() ?? '';
  if (!markdown) {
    throw new Error('DOCX appears to be empty or could not be parsed.');
  }

  return markdown;
}
