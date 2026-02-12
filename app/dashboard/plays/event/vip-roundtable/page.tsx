import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function VIPRoundtablePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard/plays" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
          ← Play Library
        </Link>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 bg-purple-50/50 px-6 py-4">
            <h1 className="text-xl font-bold text-gray-900">VIP Roundtable Dinner</h1>
            <p className="text-sm text-gray-600 mt-1">
              Event: AI Transformation in Automotive · Detroit · Mar 15
            </p>
          </div>

          <div className="p-6 space-y-6">
            <section className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Attendee targets (8–10 executives)</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p><strong>From tracked accounts:</strong></p>
                <ul className="list-disc list-inside ml-2">
                  <li>☐ Select from GM contacts</li>
                  <li>☐ Select from Rivian contacts</li>
                </ul>
                <p className="mt-2"><strong>External invites (prospects/peers):</strong> ☐ Add from LinkedIn · Import CSV</p>
                <p><strong>Existing customers (social proof):</strong> ☐ Add happy customer</p>
              </div>
              <p className="text-xs text-amber-600 mt-2">Event play builder coming soon. Use chat to draft invites and track RSVPs.</p>
            </section>

            <section className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Step 1: Personalized invitations</h3>
              <p className="text-sm text-gray-500">⏱️ 4 wks before · AI generates personalized invite per attendee</p>
              <p className="text-xs text-gray-500 mt-1">[Preview All Invites] [Send Batch] — coming soon</p>
            </section>

            <section className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Step 2: RSVP tracking</h3>
              <p className="text-sm text-gray-500">Confirmed / Pending / Declined · Follow-up needed</p>
            </section>

            <section className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Step 3: Pre-event research</h3>
              <p className="text-sm text-gray-500">⏱️ 1 wk · AI attendee brief, talking points, seating suggestions</p>
            </section>

            <section className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Step 4: Post-event follow-up</h3>
              <p className="text-sm text-gray-500">+1 day · Personalized thank-you per attendee, next-step</p>
            </section>

            <div className="pt-4 border-t border-gray-200">
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
