import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ProductProfileForm } from '@/app/dashboard/content-library/products/ProductProfileForm';

export default async function ProductProfilePage({
  params,
}: {
  params: Promise<{ catalogProductId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { catalogProductId } = await params;

  const catalogProduct = await prisma.catalogProduct.findUnique({
    where: { id: catalogProductId },
    select: { id: true, name: true, slug: true },
  });
  if (!catalogProduct) notFound();

  const profile = await prisma.productProfile.findUnique({
    where: {
      catalogProductId_userId: { catalogProductId, userId: session.user.id },
    },
  });

  const successStories = await prisma.contentLibrary.findMany({
    where: { userId: session.user.id, type: 'SuccessStory', isActive: true },
    select: { id: true, title: true },
    orderBy: { title: 'asc' },
    take: 100,
  });

  return (
    <div className="p-8 max-w-4xl bg-gray-50 dark:bg-zinc-900 min-h-screen">
      <Link
        href="/dashboard/content-library?tab=products"
        className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-4 inline-block"
      >
        ← Back to Products
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Product profile: {catalogProduct.name}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{catalogProduct.slug}</p>
      <ProductProfileForm
        catalogProductId={catalogProductId}
        catalogProductName={catalogProduct.name}
        initialData={profile ? {
          oneLiner: profile.oneLiner ?? '',
          elevatorPitch: profile.elevatorPitch ?? '',
          valueProps: (profile.valueProps as string[]) ?? [],
          painPoints: (profile.painPoints as string[]) ?? [],
          bestForDepartments: (profile.bestForDepartments as string[]) ?? [],
          bestForIndustries: (profile.bestForIndustries as string[]) ?? [],
          technicalRequirements: (profile.technicalRequirements as string[]) ?? [],
          objectionHandlers: (profile.objectionHandlers as { objection: string; response: string }[]) ?? [],
          competitivePositioning: (profile.competitivePositioning as string[]) ?? [],
          linkedCaseStudyIds: (profile.linkedCaseStudyIds as string[]) ?? [],
          priceRangeText: profile.priceRangeText ?? '',
          dealSizeSweetSpot: profile.dealSizeSweetSpot ?? '',
          salesCycle: profile.salesCycle ?? '',
          deployment: profile.deployment ?? '',
        } : null}
        successStories={successStories}
      />
    </div>
  );
}
