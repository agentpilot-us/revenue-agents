import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Providers from '@/components/Providers';
import { TooltipProvider } from '@/components/ui/tooltip';
import LayoutShell from './components/LayoutShell';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Agent Pilot',
  description: 'AI Agents That Do The Grunt Work',
};

// Mark layout as dynamic since Navigation uses auth
export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TooltipProvider>
          <Providers>
            <LayoutShell nav={<Navigation />} footer={<Footer />}>
              {children}
            </LayoutShell>
          </Providers>
        </TooltipProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
