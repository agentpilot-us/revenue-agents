'use client';

import Link from 'next/link';
import { signOutAction } from '@/lib/actions';

interface NavigationClientProps {
  isAuthenticated: boolean;
  dark?: boolean;
}

const linkMuted = (dark: boolean) =>
  dark ? 'text-muted-foreground hover:text-foreground' : 'text-muted-foreground hover:text-card-foreground';

export function NavigationClient({ isAuthenticated, dark = false }: NavigationClientProps) {
  return (
    <>
      <div className="hidden md:flex items-center space-x-6 text-sm">
        {isAuthenticated ? (
          <>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Dashboard
            </Link>
            <form action={signOutAction}>
              <button type="submit" className={`px-4 py-2 transition-colors ${linkMuted(dark)}`}>
                Sign Out
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className={`px-4 py-2 transition-colors ${linkMuted(dark)}`}>
            Sign In
          </Link>
        )}
      </div>
      <div className="md:hidden flex items-center space-x-4">
        {isAuthenticated ? (
          <>
            <Link
              href="/dashboard"
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Dashboard
            </Link>
            <form action={signOutAction}>
              <button type="submit" className={`px-3 py-2 text-sm ${linkMuted(dark)}`}>
                Sign Out
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className={`px-3 py-2 text-sm ${linkMuted(dark)}`}>
            Sign In
          </Link>
        )}
      </div>
    </>
  );
}
