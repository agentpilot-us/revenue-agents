import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function VIPRoundtablePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard/plays" className="text-primary hover:underline text-sm mb-4 inline-block">
          ← Back
        </Link>

        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="border-b border-border bg-muted/50 px-6 py-4">
            <h1 className="text-xl font-bold text-card-foreground">VIP Roundtable Dinner</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Event: AI Transformation in Automotive · Detroit · Mar 15
            </p>
          </div>

          <div className="p-6 space-y-6">
            <section className="rounded-lg border border-border bg-muted/50 p-4">
              <h3 className="font-semibold text-card-foreground mb-3">Attendee targets (8–10 executives)</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>From tracked accounts:</strong></p>
                <ul className="list-disc list-inside ml-2">
                  <li>☐ Select from GM contacts</li>
                  <li>☐ Select from Rivian contacts</li>
                </ul>
                <p className="mt-2"><strong>External invites (prospects/peers):</strong> ☐ Add from LinkedIn · Import CSV</p>
                <p><strong>Existing customers (social proof):</strong> ☐ Add happy customer</p>
              </div>
              <p className="text-xs text-amber-600 mt-2">Event builder coming soon. Use chat to draft invites and track RSVPs.</p>
            </section>

            <section className="rounded-lg border border-border bg-muted/50 p-4">
              <h3 className="font-semibold text-card-foreground mb-2">Step 1: Personalized invitations</h3>
              <p className="text-sm text-muted-foreground">⏱️ 4 wks before · AI generates personalized invite per attendee</p>
              <p className="text-xs text-muted-foreground mt-1">[Preview All Invites] [Send Batch] — coming soon</p>
            </section>

            <section className="rounded-lg border border-border bg-muted/50 p-4">
              <h3 className="font-semibold text-card-foreground mb-2">Step 2: RSVP tracking</h3>
              <p className="text-sm text-muted-foreground">Confirmed / Pending / Declined · Follow-up needed</p>
            </section>

            <section className="rounded-lg border border-border bg-muted/50 p-4">
              <h3 className="font-semibold text-card-foreground mb-2">Step 3: Pre-event research</h3>
              <p className="text-sm text-muted-foreground">⏱️ 1 wk · AI attendee brief, talking points, seating suggestions</p>
            </section>

            <section className="rounded-lg border border-border bg-muted/50 p-4">
              <h3 className="font-semibold text-card-foreground mb-2">Step 4: Post-event follow-up</h3>
              <p className="text-sm text-muted-foreground">+1 day · Personalized thank-you per attendee, next-step</p>
            </section>

            <div className="pt-4 border-t border-border">
              <Link href="/chat?play=expansion" className="text-sm text-amber-600 hover:underline">
                Use expansion chat to draft invites and follow-ups →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
