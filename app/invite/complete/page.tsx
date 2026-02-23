import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { DM_Sans } from 'next/font/google';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });

export default async function InviteCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/invite/complete');
  }

  const { token } = await searchParams;
  if (!token) {
    redirect('/login?error=InvalidCheck');
  }

  const invite = await prisma.invite.findUnique({
    where: { token },
  });

  if (!invite) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center bg-[#faf9f7] ${dmSans.variable}`}
        style={{ fontFamily: 'var(--font-dm-sans), -apple-system, sans-serif' } as React.CSSProperties}
      >
        <div className="w-full max-w-md px-6 text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-[#e2e1df] p-8">
            <h1 className="text-xl font-semibold text-[#0a0a0f] mb-2">Invalid or expired invite</h1>
            <p className="text-[#6b6b7b] mb-6">This invite link is invalid or has already been used.</p>
            <Link href="/dashboard" className="text-[#0066FF] hover:underline">Go to Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  const sessionEmail = (session.user as { email?: string }).email?.trim().toLowerCase();
  const inviteEmail = invite.email.trim().toLowerCase();

  if (sessionEmail !== inviteEmail) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center bg-[#faf9f7] ${dmSans.variable}`}
        style={{ fontFamily: 'var(--font-dm-sans), -apple-system, sans-serif' } as React.CSSProperties}
      >
        <div className="w-full max-w-md px-6 text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-[#e2e1df] p-8">
            <h1 className="text-xl font-semibold text-[#0a0a0f] mb-2">Wrong account</h1>
            <p className="text-[#6b6b7b] mb-6">
              This invite was sent to {invite.email}. You’re signed in with a different email. Sign out and sign in with the invited email to continue.
            </p>
            <Link href="/api/auth/signout" className="text-[#0066FF] hover:underline">Sign out</Link>
          </div>
        </div>
      </div>
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      accountStatus: 'active',
      activatedAt: new Date(),
    },
  });

  await prisma.invite.delete({
    where: { id: invite.id },
  });

  redirect('/dashboard');
}
