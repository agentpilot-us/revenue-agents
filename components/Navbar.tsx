'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavigationClient } from './NavigationClient';

type NavBarProps = { isAuthenticated: boolean };

export function NavBar({ isAuthenticated }: NavBarProps) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard') ?? false;

  return (
    <nav
      className={
        isDashboard
          ? 'sticky top-0 z-50 bg-background border-b border-border shadow-sm'
          : 'sticky top-0 z-50 bg-card border-b border-border shadow-sm'
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className={`flex items-center space-x-3 ${isDashboard ? 'text-foreground' : 'text-card-foreground'}`}
          >
            <img
              src="/agentpilot-logo.png"
              alt=""
              className="h-10 w-10 object-contain"
            />
            <span className="text-xl font-bold">AgentPilot</span>
          </Link>
          <NavigationClient isAuthenticated={isAuthenticated} dark={isDashboard} />
        </div>
      </div>
    </nav>
  );
}
