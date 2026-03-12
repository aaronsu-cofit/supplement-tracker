'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@vitera/lib';

const NAV_LINKS = [
  { href: '/', label: '總覽 Overview' },
  { href: '/modules', label: '模組管理 Modules' },
  { href: '/admins', label: '管理員 Admins' },
];

function AppShell({ children }) {
  const pathname = usePathname();

  return (
    <div className="hq-layout">
      <aside className="hq-sidebar">
        <div className="hq-brand">
          <div className="hq-logo">H</div>
          <h1>Vitera HQ</h1>
        </div>
        <nav className="hq-nav">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`hq-nav-link ${pathname === link.href ? 'hq-nav-link-active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
          <a
            href={process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3000'}
            className="hq-nav-link hq-nav-back"
          >
            ← 回 Portal
          </a>
        </nav>
      </aside>
      <main className="hq-main">
        <div className="hq-content">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function ClientLayout({ children }) {
  return (
    <AppLayout lineOnly>
      <AppShell>{children}</AppShell>
    </AppLayout>
  );
}
