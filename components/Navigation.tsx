import { auth } from '@/auth';
import { NavBar } from './Navbar';

// Mark as dynamic since we use auth() which accesses headers
export const dynamic = 'force-dynamic';

export default async function Navigation() {
  let isAuthenticated = false;
  try {
    const session = await auth();
    isAuthenticated = !!session;
  } catch {
    isAuthenticated = false;
  }
  return <NavBar isAuthenticated={isAuthenticated} />;
}
