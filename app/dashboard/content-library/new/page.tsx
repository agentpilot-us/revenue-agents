import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { UseCaseForm } from '@/app/components/content-library/UseCaseForm';
import { CompanyEventForm } from '@/app/components/content-library/CompanyEventForm';
import { FrameworkForm } from '@/app/components/content-library/FrameworkForm';
import { FeatureReleaseForm } from '@/app/components/content-library/FeatureReleaseForm';
import { ResourceLinkForm } from '@/app/components/content-library/ResourceLinkForm';
import Link from 'next/link';
import type { ContentType } from '@prisma/client';

const VALID_TYPES: ContentType[] = [
  'UseCase',
  'CompanyEvent',
  'Framework',
  'FeatureRelease',
  'ResourceLink',
];

export default async function NewContentLibraryItemPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const params = await searchParams;
  const type = params.type as ContentType | undefined;

  if (!type || !VALID_TYPES.includes(type)) {
    return (
      <div className="p-8 bg-gray-50 dark:bg-zinc-900 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/dashboard/content-library"
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-4 inline-block"
          >
            ← Back to Your company data
          </Link>
          <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Create new content</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Invalid or missing content type. Please select a type from the Content Library page.
          </p>
        </div>
      </div>
    );
  }

  const typeLabels: Record<ContentType, string> = {
    UseCase: 'Use Case',
    CompanyEvent: 'Event',
    Framework: 'Framework',
    FeatureRelease: 'Feature Release',
    ResourceLink: 'Resource Link',
    SuccessStory: 'Success Story',
    Persona: 'Persona',
    Battlecard: 'Battlecard',
    EmailContent: 'Email Content',
    VideoLink: 'Video Link',
    UploadedDocument: 'Uploaded Document',
  };

  return (
    <div className="p-8 bg-gray-50 dark:bg-zinc-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/dashboard/content-library"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-4 inline-block"
        >
          ← Back to Your company data
        </Link>
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          Create new {typeLabels[type]}
        </h1>
        {type === 'UseCase' && <UseCaseForm />}
        {type === 'CompanyEvent' && <CompanyEventForm />}
        {type === 'Framework' && <FrameworkForm />}
        {type === 'FeatureRelease' && <FeatureReleaseForm />}
        {type === 'ResourceLink' && <ResourceLinkForm />}
      </div>
    </div>
  );
}
