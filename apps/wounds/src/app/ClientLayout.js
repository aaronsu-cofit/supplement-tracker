'use client';

import { useEffect } from 'react';
import { LanguageProvider, LiffProvider, AuthProvider, useAuth } from '@vitera/lib';

const LOGIN_URL = process.env.NEXT_PUBLIC_LOGIN_URL || 'http://localhost:3000/login';

function RouteGuard({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) return;
    const redirect = encodeURIComponent(window.location.href);
    window.location.href = `${LOGIN_URL}?redirect=${redirect}`;
  }, [isAuthenticated, isLoading]);

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
