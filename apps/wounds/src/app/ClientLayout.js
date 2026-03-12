'use client';

import { AppLayout } from '@vitera/lib';

export default function ClientLayout({ children }) {
  return (
    <AppLayout lineOnly>
      <div className="flex flex-col min-h-screen bg-w-app text-[#e8e6f0]">
        {children}
      </div>
    </AppLayout>
  );
}
