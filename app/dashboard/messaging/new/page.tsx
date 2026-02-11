import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { NewFrameworkForm } from './NewFrameworkForm';

export default async function NewMessagingFrameworkPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');
  return <NewFrameworkForm />;
}
