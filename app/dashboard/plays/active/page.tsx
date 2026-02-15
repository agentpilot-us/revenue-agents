import { redirect } from 'next/navigation';

/** Plays framework removed: single expansion workflow. Redirect to Companies. */
export default function ActivePlaysPage() {
  redirect('/dashboard/companies');
}
