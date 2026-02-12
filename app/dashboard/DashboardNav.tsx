'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Building2,
  Library,
  Settings,
  CreditCard,
  Bolt,
  Target,
  BarChart3,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Companies', href: '/dashboard/companies', icon: Building2 },
  { name: 'Plays', href: '/dashboard/plays', icon: Target },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Content Library', href: '/dashboard/content-library', icon: Library },
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
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
