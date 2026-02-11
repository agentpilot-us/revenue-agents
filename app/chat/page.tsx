'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChatUI } from './ChatUI';

export default function ChatPage() {
  const searchParams = useSearchParams();
  const playId = searchParams.get('play') || 'expansion';
  const accountId = searchParams.get('accountId') ?? undefined;
  const contactId = searchParams.get('contactId') ?? undefined;

  const playTitle =
    playId === 'expansion'
      ? '📈 Account Expansion'
      : playId === 'partner'
        ? '🤝 Partner Enablement'
        : '⭐ Referral Program';

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 shrink-0">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <h1 className="text-xl font-semibold text-gray-900">{playTitle}</h1>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 min-h-0 px-6 py-4 flex flex-col">
        <div className="max-w-4xl mx-auto w-full flex-1 min-h-0 flex flex-col">
          <ChatUI
            playId={playId}
            {...(accountId ? { accountId } : {})}
            {...(contactId ? { contactId } : {})}
          />
        </div>
      </div>
    </div>
  );
}
