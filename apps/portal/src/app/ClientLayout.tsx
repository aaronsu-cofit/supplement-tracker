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
      // Encode full current URL as redirect param (consistent with sub-apps)
      const redirect = encodeURIComponent(window.location.href);
      router.replace(`/login?redirect=${redirect}`);
    }
  }, [isLoading, isAuthenticated, isPublic, router, pathname]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && pathname === '/login') {
      // Already handled by portal/login/page.js getSafeRedirectUrl()
      router.replace('/');
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
