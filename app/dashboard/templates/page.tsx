import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const list = await prisma.buyingGroupTemplate.findMany({
    where: {
      OR: [{ createdById: session.user.id }, { isPublic: true }],
    },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { buyingGroups: true } },
    },
    orderBy: { timesUsed: 'desc' },
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Buying group templates</h1>
      <p className="text-gray-500 mb-8">Reusable persona definitions for discovering buying groups.</p>

      {list.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          <p>No templates yet.</p>
          <p className="text-sm mt-2">Discover a buying group from a company and save it as a template.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {list.map((t) => (
            <li key={t.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="font-medium text-gray-900">{t.name}</p>
              {t.description && <p className="text-sm text-gray-500 mt-1">{t.description}</p>}
              <p className="text-xs text-gray-400 mt-2">
                {t.createdBy.name} · Used {t.timesUsed} times · {t._count.buyingGroups} groups
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
