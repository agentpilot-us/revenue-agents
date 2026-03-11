import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import type { AssetPackage } from '@/lib/content/build-asset-package';
import { renderAssetArtifact } from '@/lib/content/render-asset-artifact';
import {
  createGmailDraft,
  createGoogleDoc,
  createGoogleSlides,
  uploadDriveHtmlFile,
} from '@/lib/integrations/google-workspace-tools';

const HandoffSchema = z.object({
  destination: z.enum([
    'google_docs',
    'google_slides',
    'google_drive_file',
    'gmail_draft',
  ]),
  assetPackage: z.custom<AssetPackage>(),
  to: z.string().email().optional(),
  companyId: z.string().optional(),
  contactId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = HandoffSchema.parse(await req.json());
    const artifact = await renderAssetArtifact(body.assetPackage);

    if (body.destination === 'google_slides') {
      const result = await createGoogleSlides({
        userId: session.user.id,
        title: artifact.templateLabel,
        slides: artifact.googleSlides ?? [],
      });
      return NextResponse.json({ ok: true, destination: body.destination, result });
    }

    if (body.destination === 'google_docs') {
      const result = await createGoogleDoc({
        userId: session.user.id,
        title: artifact.templateLabel,
        body: artifact.googleDocsBody ?? body.assetPackage.formattedRaw,
      });
      return NextResponse.json({ ok: true, destination: body.destination, result });
    }

    if (body.destination === 'google_drive_file') {
      const result = await uploadDriveHtmlFile({
        userId: session.user.id,
        title: artifact.templateLabel,
        html: artifact.html ?? `<pre>${body.assetPackage.formattedRaw}</pre>`,
      });
      return NextResponse.json({ ok: true, destination: body.destination, result });
    }

    const gmail = artifact.gmailDraft ?? {
      subject: artifact.templateLabel,
      body: body.assetPackage.formattedRaw,
    };
    let to = body.to;
    if (!to && body.contactId && body.companyId) {
      const contact = await prisma.contact.findFirst({
        where: {
          id: body.contactId,
          companyId: body.companyId,
        },
        select: { email: true },
      });
      to = contact?.email ?? undefined;
    }
    if (!to) {
      return NextResponse.json(
        { error: 'Recipient email is required for Gmail draft creation.' },
        { status: 400 },
      );
    }
    const result = await createGmailDraft({
      userId: session.user.id,
      to,
      subject: gmail.subject,
      body: gmail.body,
    });
    return NextResponse.json({ ok: true, destination: body.destination, result });
  } catch (error) {
    console.error('POST /api/handoff/google-workspace error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to hand off asset' },
      { status: 500 },
    );
  }
}
