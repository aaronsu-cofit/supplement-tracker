'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LanguageProvider, LiffProvider, AuthProvider, ModuleProvider, useAuth } from '@vitera/lib';

const PUBLIC_ROUTES = ['/login'];

function RouteGuard({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r));

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublic) {
      const params = new URLSearchParams();
      if (pathname !== '/' && pathname !== '/login') params.set('path', pathname);
      const q = params.toString();
      router.replace(`/login${q ? '?' + q : ''}`);
    }
  }, [isLoading, isAuthenticated, isPublic, router, pathname]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && pathname === '/login') {
      const sp = new URLSearchParams(window.location.search);
      router.replace(sp.get('path') || '/');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  return children;
}

export default function ClientLayout({ children }) {
  return (
    <LiffProvider>
      <AuthProvider>
        <ModuleProvider>
          <LanguageProvider>
            <RouteGuard>{children}</RouteGuard>
          </LanguageProvider>
        </ModuleProvider>
      </AuthProvider>
    </LiffProvider>
  );
}
