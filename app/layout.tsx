import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Revenue Agents - Launch AI-Native Revenue Programs',
  description:
    'Pre-built Agentforce blueprints, working code, and proven playbooks. Everything you need to deploy enterprise-grade revenue agents.',
};

// Mark layout as dynamic since Navigation uses auth
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <Navigation />
        </ErrorBoundary>
        {children}
        <ErrorBoundary>
          <Footer />
        </ErrorBoundary>
      </body>
    </html>
  );
}

// Simple error boundary component
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  try {
    return <>{children}</>;
  } catch (error) {
    console.error('Layout error:', error);
    return null; // Don't render if there's an error
  }
}
