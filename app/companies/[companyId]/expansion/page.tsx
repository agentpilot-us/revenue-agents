import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ProductPenetrationMatrix } from '@/app/components/company/ProductPenetrationMatrix';

export default async function ExpansionPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const { companyId } = await params;

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
    include: {
      departments: {
        include: {
          companyProducts: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  if (!company) notFound();

  const products = await prisma.catalogProduct.findMany({
    where: { userId: session.user.id },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={`/dashboard/companies/${company.id}`}
          className="text-blue-600 hover:text-blue-700 mb-6 inline-block"
        >
          ← Back to {company.name}
        </Link>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">{company.name}</h1>
          <p className="text-gray-600">
            {company.domain ?? '—'} • {company.industry ?? '—'}
          </p>
        </div>

        <ProductPenetrationMatrix
          data={{
            departments: company.departments,
            products,
            companyId: company.id,
          }}
        />
      </div>
    </div>
  );
}
