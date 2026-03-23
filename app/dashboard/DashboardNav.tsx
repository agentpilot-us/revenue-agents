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
  BarChart3,
  Presentation,
  Users,
  Map,
  Play,
} from 'lucide-react';
import { dash, PRIMARY_NAV_KEYS, UTILITY_NAV_KEYS } from '@/app/dashboard/dashboard-classes';

const navigation: Array<{
  name: string;
  href: string;
  icon: typeof Home;
}> = [
  { name: 'My Day', href: '/dashboard', icon: Home },
  { name: 'Strategic Account Plan', href: '/dashboard/roadmap', icon: Map },
  { name: 'Target Accounts', href: '/dashboard/companies', icon: Building2 },
  { name: 'Plays', href: '/dashboard/plays', icon: Play },
  { name: 'My Company', href: '/dashboard/my-company', icon: BookOpen },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Webhooks', href: '/dashboard/webhooks', icon: Bolt },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Billing', href: '/billing', icon: CreditCard },
];

export function DashboardNav({ allowDemoSetup = false }: { allowDemoSetup?: boolean }) {
  const pathname = usePathname();

  const allLinks = allowDemoSetup
    ? [
        ...navigation.slice(0, 2),
        { name: 'Demo setup', href: '/dashboard/admin/demo-setup', icon: Presentation },
        { name: 'Autonomous demo', href: '/dashboard/demo/autonomous-play', icon: Play },
        { name: 'Waitlist', href: '/dashboard/admin/users', icon: Users },
        ...navigation.slice(2),
      ]
    : navigation;

  const primaryLinks = allLinks.filter((l) => PRIMARY_NAV_KEYS.includes(l.name));
  const utilityLinks = allLinks.filter((l) => UTILITY_NAV_KEYS.includes(l.name));

  const renderLink = (item: (typeof allLinks)[number]) => {
    const Icon = item.icon;
    const isActive =
      item.href === '/dashboard'
        ? pathname === '/dashboard'
        : pathname.startsWith(item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`${dash.sidebarNavItem} ${
          isActive ? dash.sidebarNavItemActive : dash.sidebarNavItemDefault
        }`}
      >
        <Icon
          className={`${dash.sidebarNavIcon} ${
            isActive ? dash.sidebarNavIconActive : dash.sidebarNavIconDefault
          }`}
        />
        <span className="flex-1">{item.name}</span>
      </Link>
    );
  };

  return (
    <>
      <nav className={dash.sidebarNav}>
        {primaryLinks.map(renderLink)}
      </nav>

      <div className={dash.sidebarDivider} />

      <div className={dash.sidebarFooter}>
        {utilityLinks.map(renderLink)}
      </div>
    </>
  );
}
