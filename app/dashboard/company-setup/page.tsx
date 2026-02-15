import { redirect } from 'next/navigation';

/** Redirect old company-setup links to unified Content Library. */
export default function CompanySetupPage() {
  redirect('/dashboard/content-library');
}
