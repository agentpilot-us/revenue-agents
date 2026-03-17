import { redirect } from 'next/navigation';

/**
 * Legacy execute workflow page. All plays now use PlayRun and the run page.
 * Redirect to company page so the user can start a play from the catalog or see My Day.
 */
export default async function PlayExecutePage({
  params,
}: {
  params: Promise<{ id: string; workflowId: string }>;
}) {
  const { id: companyId } = await params;
  redirect(`/dashboard/companies/${companyId}`);
}
