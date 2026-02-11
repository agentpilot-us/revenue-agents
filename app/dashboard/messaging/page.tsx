import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';

export default async function MessagingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const frameworks = await prisma.messagingFramework.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Messaging frameworks</h1>
          <p className="text-gray-500">
            Upload positioning, value props, and key messages. The Expansion agent uses your frameworks when drafting outreach.
          </p>
        </div>
        <Link
          href="/dashboard/messaging/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          Add framework
        </Link>
      </div>

      {frameworks.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          <p className="font-medium text-gray-700">No messaging frameworks yet</p>
          <p className="text-sm mt-2">Product marketing can add value props, positioning, and key messages so the agent stays on-brand.</p>
          <Link
            href="/dashboard/messaging/new"
            className="inline-block mt-4 text-blue-600 font-medium hover:text-blue-700"
          >
            Add your first framework →
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {frameworks.map((f) => (
            <li key={f.id} className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 transition-colors">
              <Link href={`/dashboard/messaging/${f.id}`} className="block">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{f.name}</p>
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2">{f.content}</p>
                  </div>
                  <span className="text-gray-400 shrink-0">Edit →</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
