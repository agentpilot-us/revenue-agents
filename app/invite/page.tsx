import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const session = await auth();
  const { token } = await searchParams;

  if (!token) {
    redirect('/login?error=InvalidCheck');
  }

  const callbackUrl = `/invite/complete?token=${encodeURIComponent(token)}`;

  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  redirect(callbackUrl);
}
