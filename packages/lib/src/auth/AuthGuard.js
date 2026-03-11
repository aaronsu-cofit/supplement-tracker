'use client';

import { useAuth } from './AuthProvider.js';
import { useEffect } from 'react';

/**
 * AuthGuard — redirects unauthenticated users to the central login page.
 *
 * Usage in ClientLayout:
 *   <AuthGuard loginUrl={process.env.NEXT_PUBLIC_LOGIN_URL}>
 *     {children}
 *   </AuthGuard>
 *
 * The login page should redirect back using the `?redirect=` param after login.
 *
 * @param {string} loginUrl - Full URL of the central login page (e.g. https://vitera.com/login)
 * @param {string[]} publicPaths - Optional path prefixes that don't require auth (default: [])
 */
export default function AuthGuard({ children, loginUrl, publicPaths = [] }) {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) return;

    const pathname = window.location.pathname;
    const isPublic = publicPaths.some((p) => pathname.startsWith(p));
    if (isPublic) return;

    const redirect = encodeURIComponent(window.location.href);
    window.location.href = `${loginUrl}?redirect=${redirect}`;
  }, [isAuthenticated, isLoading, loginUrl, publicPaths]);

  // Show nothing while checking auth or redirecting
  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-9 h-9 rounded-full border-[3px] border-white/10 border-t-white/60 animate-spin" />
      </div>
    );
  }

  return children;
}
