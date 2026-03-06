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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{
          width: 36, height: 36,
          border: '3px solid rgba(255,255,255,0.1)',
          borderTop: '3px solid rgba(255,255,255,0.6)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return children;
}
