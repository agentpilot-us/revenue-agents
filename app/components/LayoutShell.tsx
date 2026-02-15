'use client';

import { usePathname } from 'next/navigation';

export default function LayoutShell({
  children,
  nav,
  footer,
}: {
  children: React.ReactNode;
  nav: React.ReactNode;
  footer: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <>
      {nav}
      {children}
      {footer}
    </>
  );
}
