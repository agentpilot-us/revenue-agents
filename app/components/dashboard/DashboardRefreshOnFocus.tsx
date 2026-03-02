'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Refreshes dashboard data when the user returns to the tab (Phase 5.3).
 * Ensures Plan status, Radar cards, and NBA reflect updates after actions on company pages.
 */
export function DashboardRefreshOnFocus() {
  const router = useRouter();

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [router]);

  return null;
}
