'use client';

import LiffProvider from './liff/LiffProvider.js';
import AuthProvider from './auth/AuthProvider.js';
import AuthGuard from './auth/AuthGuard.js';
import { LanguageProvider } from './i18n/LanguageContext.js';

const DEFAULT_LOGIN_URL = process.env.NEXT_PUBLIC_LOGIN_URL || 'http://localhost:3000/login';

/**
 * AppLayout — standard layout for all Vitera sub-apps.
 * Wraps LiffProvider → AuthProvider → LanguageProvider → AuthGuard.
 *
 * Usage in ClientLayout.js:
 *   export default function ClientLayout({ children }) {
 *     return <AppLayout>{children}</AppLayout>;
 *   }
 *
 * @param {string}   [liffId]      Override NEXT_PUBLIC_LIFF_ID for this app.
 * @param {string}   [loginUrl]    Override NEXT_PUBLIC_LOGIN_URL redirect target.
 * @param {string[]} [publicPaths] Path prefixes that skip the auth guard.
 */
export default function AppLayout({ children, liffId, loginUrl, publicPaths }) {
  return (
    <LiffProvider liffId={liffId}>
      <AuthProvider>
        <LanguageProvider>
          <AuthGuard
            loginUrl={loginUrl || DEFAULT_LOGIN_URL}
            publicPaths={publicPaths}
          >
            {children}
          </AuthGuard>
        </LanguageProvider>
      </AuthProvider>
    </LiffProvider>
  );
}
