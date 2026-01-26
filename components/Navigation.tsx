import Link from 'next/link';
import { Zap } from 'lucide-react';
import { auth } from '@/auth';
import { NavigationClient } from './NavigationClient';

// Mark as dynamic since we use auth() which accesses headers
export const dynamic = 'force-dynamic';

export default async function Navigation() {
  let isAuthenticated = false;
  
  // Safely check auth - if it fails, just continue without auth
  try {
    const session = await auth();
    isAuthenticated = !!session;
  } catch (error: any) {
    // Don't throw - just continue without authentication
    // This prevents the entire app from crashing
    isAuthenticated = false;
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">Revenue Agents</span>
          </Link>
          <NavigationClient isAuthenticated={isAuthenticated} />
        </div>
      </div>
    </nav>
  );
}
