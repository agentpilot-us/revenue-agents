import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import type { AssetPackage } from '@/lib/content/build-asset-package';
import { renderAssetArtifact } from '@/lib/content/render-asset-artifact';

const ExportSchema = z.object({
  mode: z.enum(['html_preview', 'html_download', 'pptx_download']),
  assetPackage: z.custom<AssetPackage>(),
});

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_').slice(0, 80) || 'asset';
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = ExportSchema.parse(await req.json());
    const artifact = await renderAssetArtifact(body.assetPackage);
    const filename = safeFilename(artifact.templateLabel);

    if (body.mode === 'pptx_download') {
      if (!artifact.pptx) {
        return NextResponse.json(
          { error: 'This asset does not support PPTX export.' },
          { status: 400 },
        );
      }
      return new NextResponse(new Uint8Array(artifact.pptx), {
        status: 200,
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'Content-Disposition': `attachment; filename="${filename}.pptx"`,
        },
      });
    }

    if (!artifact.html) {
      return NextResponse.json(
        { error: 'This asset does not support HTML export.' },
        { status: 400 },
      );
    }

    if (body.mode === 'html_download') {
      return new NextResponse(artifact.html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.html"`,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      html: artifact.html,
      templateLabel: artifact.templateLabel,
    });
  } catch (error) {
    console.error('POST /api/export/assets error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export asset' },
      { status: 500 },
    );
  }
}
