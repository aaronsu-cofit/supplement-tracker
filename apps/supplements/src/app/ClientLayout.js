'use client';

import { AppLayout } from '@vitera/lib';

export default function ClientLayout({ children }) {
  return <AppLayout lineOnly>{children}</AppLayout>;
}
