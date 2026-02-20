import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { NewProductForm } from './NewProductForm';

export default async function NewProductPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  return (
    <div className="p-8 bg-gray-50 dark:bg-zinc-900 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/dashboard/content-library"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-4 inline-block"
        >
          ← Back to Your company data
        </Link>
        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Add product</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Add a product to your company data. The AI uses this when personalizing outreach and value propositions.
        </p>
        <NewProductForm />
      </div>
    </div>
  );
}
