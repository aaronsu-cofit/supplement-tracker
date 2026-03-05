'use client';
import { usePathname } from 'next/navigation';
import AppHeader from '@/app/components/AppHeader';

export default function WoundsLayout({ children }) {
    const pathname = usePathname();
    const isAdmin = pathname?.includes('/admin');

    // Dashboard (/wounds) and create page manage their own headers internally.
    // Sub-pages (scan, history, result) get the shared AppHeader from the layout.
    const isDashboard = pathname === '/wounds';
    const isCreate = pathname === '/wounds/create';

    const showLayoutHeader = !isAdmin && !isDashboard && !isCreate;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #1a1225 0%, #1e1530 40%, #16202e 100%)',
            color: '#e8e6f0',
        }}>
            {showLayoutHeader && (
                <AppHeader
                    backHref="/wounds"
                    title="傷口智慧照護"
                    accent="linear-gradient(135deg, #ff9a9e, #fda085)"
                />
            )}
            <main style={{ flex: 1, overflowY: 'auto' }}>
                {children}
            </main>
        </div>
    );
}
