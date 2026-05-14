'use client';
// AppLayout wires LiffProvider → AuthProvider → LanguageProvider →
// AuthGuard. `lineOnly` means: if not opened inside LINE in-app
// browser, show a "open in LINE" gate instead of letting the page
// render. This is consistent with the other LIFF apps.
//
// If we add a future web (non-LINE) version of the questionnaire app,
// flip lineOnly off and rely on the anonymous_id fallback the hooks
// already support.

import { AppLayout } from '@vitera/lib';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout lineOnly>{children}</AppLayout>;
}
