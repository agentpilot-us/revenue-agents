import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PlayStatus } from '@prisma/client';
import { PLAY_CATEGORIES } from '@/lib/play-library';
import { Target } from 'lucide-react';

export default async function PlayLibraryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const [expansionActive, useCaseActive] = await Promise.all([
    prisma.expansionPlay.count({
      where: {
        company: { userId: session.user.id },
        status: { notIn: [PlayStatus.WON, PlayStatus.LOST] },
      },
    }),
    prisma.useCaseExplorationPlay.count({
      where: {
        company: { userId: session.user.id },
        playState: { notIn: ['completed', 'cancelled'] },
      },
    }),
  ]);
  const activeCount = expansionActive + useCaseActive;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Play Library</h1>
            <p className="text-gray-600 mt-1">
              Choose a play to run. Expansion plays grow revenue within existing accounts.
            </p>
          </div>
          <Link
            href="/dashboard/plays/active"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/90 text-gray-900 font-medium hover:bg-amber-500"
          >
            <Target className="h-4 w-4" />
            Active Plays {activeCount > 0 && `(${activeCount})`}
          </Link>
        </div>

        <div className="space-y-10">
          {PLAY_CATEGORIES.map((category) => (
            <section
              key={category.id}
              className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
            >
              <div className="border-b border-gray-200 bg-gray-50/80 px-6 py-4">
                <h2 className="text-lg font-semibold uppercase tracking-wide text-gray-900">
                  {category.name}
                </h2>
                <p className="text-sm text-gray-600 mt-0.5">{category.description}</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.plays.map((play) => (
                    <Link
                      key={play.id}
                      href={play.href}
                      className="block rounded-lg border border-gray-200 bg-gray-50/50 p-4 hover:border-amber-400 hover:bg-amber-50/30 transition-colors"
                    >
                      <h3 className="font-semibold text-gray-900">{play.name}</h3>
                      <p className="text-sm text-amber-700 font-medium mt-1">{play.tagline}</p>
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{play.description}</p>
                      {play.hasExecutionFlow && (
                        <span className="inline-block mt-3 text-xs font-medium text-amber-600">
                          Run play →
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
