'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/tools/resend';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';

export async function getAllowUserAdmin(): Promise<boolean> {
  return process.env.ALLOW_DEMO_SETUP === 'true';
}

export async function getWaitlistEntries(): Promise<
  Array<{ id: string; email: string; companyName: string | null; requestedAt: Date }>
> {
  const session = await auth();
  if (!session?.user?.id) return [];
  if (process.env.ALLOW_DEMO_SETUP !== 'true') return [];

  const entries = await prisma.waitlistEntry.findMany({
    orderBy: { requestedAt: 'desc' },
    select: { id: true, email: true, companyName: true, requestedAt: true },
  });
  return entries;
}

/** Users who signed in but are still waitlist (no Request access form submission). */
export async function getWaitlistUsers(): Promise<
  Array<{ id: string; email: string; name: string | null; createdAt: Date }>
> {
  const session = await auth();
  if (!session?.user?.id) return [];
  if (process.env.ALLOW_DEMO_SETUP !== 'true') return [];

  const users = await prisma.user.findMany({
    where: { accountStatus: 'waitlist' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  return users;
}

/** Activate a user (set accountStatus to active). Use for accounts that already signed in. */
export async function activateUser(
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };
  if (process.env.ALLOW_DEMO_SETUP !== 'true') return { ok: false, error: 'Not enabled' };

  const user = await prisma.user.findFirst({
    where: { id: userId, accountStatus: 'waitlist' },
    select: { id: true },
  });
  if (!user) return { ok: false, error: 'User not found or already active' };

  await prisma.user.update({
    where: { id: userId },
    data: { accountStatus: 'active', activatedAt: new Date() },
  });

  revalidatePath('/dashboard/admin/users');
  return { ok: true };
}

export async function approveWaitlistEntry(
  waitlistEntryId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };
  if (process.env.ALLOW_DEMO_SETUP !== 'true') return { ok: false, error: 'Not enabled' };

  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: waitlistEntryId },
  });
  if (!entry) return { ok: false, error: 'Entry not found' };

  const token = nanoid(32);
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000';
  const inviteUrl = `${baseUrl}/invite?token=${encodeURIComponent(token)}`;

  await prisma.invite.create({
    data: {
      email: entry.email.trim().toLowerCase(),
      token,
      companyName: entry.companyName,
    },
  });

  const from = process.env.RESEND_FROM ?? 'login@agentpilot.us';
  const result = await sendEmail({
    from,
    to: entry.email,
    subject: "You're invited to AgentPilot",
    html: `
      <p>You've been approved for AgentPilot.</p>
      <p><a href="${inviteUrl}">Accept your invite and sign in</a></p>
      <p>Or copy this link: ${inviteUrl}</p>
      <p>This link doesn't expire. If you have any questions, reply to this email.</p>
      <p>— AgentPilot</p>
    `,
  });

  if (!result.ok) {
    await prisma.invite.deleteMany({ where: { token } });
    return { ok: false, error: result.error };
  }

  await prisma.waitlistEntry.delete({
    where: { id: waitlistEntryId },
  });

  revalidatePath('/dashboard/admin/users');
  return { ok: true };
}
