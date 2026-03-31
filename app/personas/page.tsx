import { redirect } from 'next/navigation';

/** Legacy URL: buyer personas now live under My Company → Personas. */
export default function PersonasPage() {
  redirect('/dashboard/my-company?tab=Personas');
}
