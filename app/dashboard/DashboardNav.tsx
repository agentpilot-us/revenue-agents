'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Building2,
  BookOpen,
  Settings,
  CreditCard,
  Bolt,
  FileText,
} from 'lucide-react';

const navigation: Array<{
  name: string;
  href: string;
  icon: typeof Home;
  badgeCount?: number;
}> = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Target companies', href: '/dashboard/companies', icon: Building2 },
  { name: 'Create content', href: '/dashboard/create-content', icon: FileText },
  { name: 'Your company data', href: '/dashboard/content-library', icon: BookOpen },
  { name: 'Webhooks', href: '/dashboard/webhooks', icon: Bolt },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Billing', href: '/billing', icon: CreditCard },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href);
        const count = 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
              isActive
                ? 'bg-zinc-800 text-amber-400'
                : 'text-slate-300 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="flex-1">{item.name}</span>
            {count > 0 && (
              <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-xs font-medium text-zinc-900">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
