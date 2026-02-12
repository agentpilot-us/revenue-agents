import Link from 'next/link';

export default function PlayComingSoonPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Coming soon</h1>
        <p className="text-gray-600 mb-6">
          This play is in the roadmap. Use the Play Library to start available plays.
        </p>
        <Link
          href="/dashboard/plays"
          className="inline-block px-4 py-2 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400"
        >
          Back to Play Library
        </Link>
      </div>
    </div>
  );
}
