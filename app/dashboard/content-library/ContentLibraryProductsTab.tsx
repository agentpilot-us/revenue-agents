'use client';

import Link from 'next/link';

type CatalogProductRow = {
  id: string;
  name: string;
  slug: string;
  hasProfile: boolean;
  profileUpdatedAt: string | null;
};

type SuccessStory = { id: string; title: string };

type Props = {
  catalogProducts: CatalogProductRow[];
  successStories: SuccessStory[];
};

export function ContentLibraryProductsTab({
  catalogProducts,
  successStories: _successStories,
}: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Product profiles power the AI with one-liners, value props, objection handlers, and linked case studies. Edit a profile to add expert knowledge for that product.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {catalogProducts.map((p) => (
          <div
            key={p.id}
            className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-zinc-800"
          >
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{p.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{p.slug}</p>
            {p.hasProfile && p.profileUpdatedAt && (
              <p className="text-xs text-green-600 dark:text-green-400 mb-3">
                Profile updated {new Date(p.profileUpdatedAt).toLocaleDateString()}
              </p>
            )}
            <Link href={`/dashboard/content-library/products/${p.id}`}>
              <button
                type="button"
                className="w-full px-3 py-2 text-sm border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                {p.hasProfile ? 'Edit profile' : 'Add profile'}
              </button>
            </Link>
          </div>
        ))}
      </div>
      {catalogProducts.length === 0 && (
        <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-zinc-800">
          No catalog products yet. Add products from the product catalog first.
        </div>
      )}
    </div>
  );
}
