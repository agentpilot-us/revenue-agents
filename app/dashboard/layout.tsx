import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  Building2,
  Library,
  Settings,
  CreditCard,
  Bolt,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Companies', href: '/dashboard/companies', icon: Building2 },
  { name: 'Content Library', href: '/dashboard/content-library', icon: Library },
  { name: 'Webhooks', href: '/dashboard/webhooks', icon: Bolt },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Billing', href: '/billing', icon: CreditCard },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/api/auth/signin');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed left-0 top-0 z-40 h-full w-56 border-r border-gray-200 bg-white">
        <div className="flex h-full flex-col px-4 py-6">
          <h2 className="mb-6 px-2 text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Dashboard
          </h2>
          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      <main className="pl-56">{children}</main>
    </div>
  );
}
