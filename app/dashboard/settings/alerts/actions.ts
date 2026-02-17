'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export type AlertSettingsPayload = {
  enabled?: boolean;
  email?: boolean;
  emailDigest?: 'instant' | 'daily';
  slack?: boolean;
  inApp?: boolean;
  slackWebhookUrl?: string;
  webhookUrl?: string;
  highValueVisitor?: boolean;
  executiveVisit?: boolean;
  multipleChatMessages?: boolean;
  formSubmission?: boolean;
  ctaClicked?: boolean;
  returningVisitor?: boolean;
};

export async function updateAlertSettings(settings: AlertSettingsPayload) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      alertSettings: settings as object,
      slackWebhookUrl: settings.slackWebhookUrl?.trim() || null,
    },
  });
  revalidatePath('/dashboard/settings/alerts');
}
