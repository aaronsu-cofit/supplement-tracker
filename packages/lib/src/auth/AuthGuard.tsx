'use client';

import React, { useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useLiff } from '../liff/LiffProvider';

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-9 h-9 rounded-full border-[3px] border-white/10 border-t-white/60 animate-spin" />
    </div>
  );
}

/**
 * AuthGuard — redirects unauthenticated users to LINE OAuth or a central login page.
 *
 * @param {string}   [loginUrl]    URL of the central login page (used only when lineOnly=false)
 * @param {string[]} [publicPaths] Path prefixes that skip the auth guard
 * @param {boolean}  [lineOnly]    When true, redirect to LINE OAuth via liff.login()
 */
export default function AuthGuard({ children, loginUrl, publicPaths = [], lineOnly = false }: { children: React.ReactNode; loginUrl?: string; publicPaths?: string[]; lineOnly?: boolean }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { liff, isInitialized: liffInitialized } = useLiff();

  const isPublicPath = typeof window !== 'undefined'
    ? publicPaths.some((p) => window.location.pathname.startsWith(p))
    : false;

  useEffect(() => {
    if (isLoading || isAuthenticated || isPublicPath) return;

    if (lineOnly && liff && liffInitialized) {
      liff.login({ redirectUri: window.location.href });
      return;
    }

    if (!lineOnly && loginUrl) {
      const redirect = encodeURIComponent(window.location.href);
      window.location.href = `${loginUrl}?redirect=${redirect}`;
    }
  }, [isAuthenticated, isLoading, loginUrl, isPublicPath, lineOnly, liff, liffInitialized]);

  if (isLoading || !isAuthenticated) return <Spinner />;

  return children;
}
