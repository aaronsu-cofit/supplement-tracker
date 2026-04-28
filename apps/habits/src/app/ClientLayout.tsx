'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppLayout } from '@vitera/lib';

const TABS: { href: string; icon: string; label: string; match: (p: string) => boolean }[] = [
  { href: '/', icon: '📋', label: '今日', match: p => p === '/' },
  { href: '/history', icon: '📅', label: '歷史', match: p => p.startsWith('/history') || p.startsWith('/habits') },
  { href: '/review', icon: '📊', label: '回顧', match: p => p.startsWith('/review') },
  { href: '/me', icon: '🏆', label: '我', match: p => p.startsWith('/me') },
];

function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="tab-bar">
      {TABS.map(t => {
        const active = t.match(pathname);
        return (
          <Link key={t.href} href={t.href} className={active ? 'active' : ''}>
            <span className="icon">{t.icon}</span>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout lineOnly>
      <main className="mobile-container">{children}</main>
      <TabBar />
    </AppLayout>
  );
}
