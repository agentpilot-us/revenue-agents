import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/api/auth/signin');
  }

  const navLinks = [
    { href: '/dashboard', label: 'Companies' },
    { href: '/dashboard/templates', label: 'Templates' },
    { href: '/dashboard/messaging', label: 'Messaging' },
    { href: '/dashboard/settings', label: 'Settings' },
    { href: '/portal', label: 'Billing' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed left-0 top-0 z-40 h-full w-56 border-r border-gray-200 bg-white">
        <div className="flex h-full flex-col px-4 py-6">
          <h2 className="mb-6 px-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Dashboard
          </h2>
          <nav className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
      <main className="pl-56">{children}</main>
    </div>
  );
}
