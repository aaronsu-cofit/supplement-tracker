'use client';

import { AppLayout } from '@vitera/lib';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout lineOnly>
      <main className="mobile-container">
        {children}
      </main>
    </AppLayout>
  );
}
