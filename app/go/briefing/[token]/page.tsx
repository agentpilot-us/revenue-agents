import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { createHmac } from 'crypto';
import { BriefingCodeGate } from './BriefingCodeGate';

export const dynamic = 'force-dynamic';

const HMAC_SECRET = process.env.NEXTAUTH_SECRET ?? 'briefing-verify-fallback';

function verifySignature(token: string, signature: string): boolean {
  const expected = createHmac('sha256', HMAC_SECRET).update(token).digest('hex');
  return expected === signature;
}

type EventAttendancePayload = {
  eventName: string;
  eventDate: string;
  rsvpStatus?: string | null;
};

type Props = { params: Promise<{ token: string }> };

export default async function SharedBriefingPage({ params }: Props) {
  const { token } = await params;

  const briefing = await prisma.sharedBriefing.findUnique({ where: { token } });
  if (!briefing || briefing.expiresAt < new Date()) {
    notFound();
  }

  const cookieStore = await cookies();
  const sig = cookieStore.get(`briefing_${token}`)?.value;
  const isVerified = sig ? verifySignature(token, sig) : false;

  if (!isVerified) {
    return <BriefingCodeGate token={token} />;
  }

  if (!briefing.viewedAt) {
    await prisma.sharedBriefing.update({
      where: { token },
      data: { viewedAt: new Date() },
    });
  }

  const payload = briefing.briefingPayload as Record<string, unknown>;
  const sections = (payload.sections ?? []) as Array<{ title: string; body: string }>;
  const companyName = (payload.companyName as string) ?? '';
  const contactName = (payload.contactName as string) ?? '';
  const contactTitle = (payload.contactTitle as string) ?? '';
  const eventAttendances = (payload.eventAttendances ?? []) as EventAttendancePayload[];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-bold">
            {companyName ? `Briefing: ${companyName}` : 'Shared Briefing'}
          </h1>
          {contactName && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Prepared for {contactName}{contactTitle ? `, ${contactTitle}` : ''}
            </p>
          )}
        </header>

        {eventAttendances.length > 0 && (
          <div className="mb-6 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              Upcoming Events
            </h2>
            <div className="space-y-2">
              {eventAttendances.map((ea, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="shrink-0 mt-0.5 h-2 w-2 rounded-full bg-blue-500" />
                  <div>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {contactName || 'Contact'}{contactTitle ? `, ${contactTitle}` : ''}
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {' '}will be at{' '}
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {ea.eventName}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-500 ml-1">
                      ({new Date(ea.eventDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
                    </span>
                    {ea.rsvpStatus && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300">
                        {ea.rsvpStatus}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          {sections.length > 0 ? (
            sections.map((s, i) => (
              <section key={i} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
                  {s.title}
                </h2>
                <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {s.body}
                </div>
              </section>
            ))
          ) : (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <pre className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
                {typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <footer className="mt-10 text-center text-xs text-zinc-400">
          This briefing expires automatically. Do not forward this link.
        </footer>
      </div>
    </div>
  );
}
