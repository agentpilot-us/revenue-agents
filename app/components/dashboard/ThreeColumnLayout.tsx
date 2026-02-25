import { ReactNode } from 'react';

type ThreeColumnLayoutProps = {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
};

export function ThreeColumnLayout({ left, center, right }: ThreeColumnLayoutProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        <aside className="lg:col-span-4 space-y-4">
          {left}
        </aside>
        <section className="lg:col-span-5 space-y-4">
          {center}
        </section>
        <aside className="lg:col-span-3 space-y-4">
          {right}
        </aside>
      </div>
    </div>
  );
}
