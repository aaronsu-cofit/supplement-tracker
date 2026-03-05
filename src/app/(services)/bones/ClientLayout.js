'use client';
import { usePathname } from 'next/navigation';
import AppHeader from '@/app/components/AppHeader';

export default function BonesLayout({ children }) {
    const pathname = usePathname();
    const isRoot = pathname === '/bones';

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #182825 0%, #1a3630 40%, #152b25 100%)',
            color: '#e8f0eb',
        }}>
            <AppHeader
                backHref={isRoot ? '/' : '/bones'}
                title="足踝照護中心"
                accent="linear-gradient(135deg, #a8ff78, #78ffd6)"
            />
            <main style={{ flex: 1, overflowY: 'auto' }}>
                {children}
            </main>
        </div>
    );
}
