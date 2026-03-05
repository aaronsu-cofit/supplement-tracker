'use client';

import { LanguageProvider, LiffProvider, AuthProvider, useAuth } from '@cofit/lib';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

function RouteGuard({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, pathname, router]);
  return children;
}

export default function ClientLayout({ children }) {
  return (
    <LiffProvider>
      <AuthProvider>
        <LanguageProvider>
          <RouteGuard>{children}</RouteGuard>
        </LanguageProvider>
      </AuthProvider>
    </LiffProvider>
  );
}
