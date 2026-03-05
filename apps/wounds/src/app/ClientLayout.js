'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LanguageProvider, LiffProvider, AuthProvider, useAuth } from '@cofit/lib';

const PUBLIC_ROUTES = ['/login'];

function RouteGuard({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r));

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublic) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, isPublic, router, pathname]);

  return children;
}

export default function ClientLayout({ children }) {
  return (
    <LiffProvider>
      <AuthProvider>
        <LanguageProvider>
          <RouteGuard>
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'linear-gradient(180deg, #1a1225 0%, #1e1530 40%, #16202e 100%)', color: '#e8e6f0' }}>
              {children}
            </div>
          </RouteGuard>
        </LanguageProvider>
      </AuthProvider>
    </LiffProvider>
  );
}
