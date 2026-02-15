import { redirect } from 'next/navigation';

/**
 * Plays framework removed: single expansion workflow only.
 * Redirect to Companies; use "Work with agent" or "Launch outreach" from a company.
 */
export default function PlayLibraryPage() {
  redirect('/dashboard/companies');
}
