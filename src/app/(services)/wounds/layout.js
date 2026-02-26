'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function WoundsLayout({ children }) {
    const pathname = usePathname();
    const isAdmin = pathname?.includes('/admin');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f5f7fa', color: '#333' }}>
            {/* Top App Bar Header */}
            {!isAdmin && (
                <header style={{
                background: '#fff',
                padding: '1rem',
                borderBottom: '1px solid #eaeaea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                    <h1 style={{ fontSize: '1.1rem', margin: 0, color: '#ff6b6b' }}>🩹 Wounds Care V1</h1>
                </header>
            )}

            {/* Main Content Area */}
            <main style={{ flex: 1, paddingBottom: isAdmin ? '0' : '70px', overflowY: 'auto' }}>
                {children}
            </main>

            {/* Bottom Navigation for Wounds App */}
            {!isAdmin && (
                <nav style={{
                    position: 'fixed',
                bottom: 0,
                width: '100%',
                background: '#fff',
                borderTop: '1px solid #eaeaea',
                display: 'flex',
                justifyContent: 'space-around',
                padding: '0.8rem 0',
                paddingBottom: 'env(safe-area-inset-bottom, 1rem)'
            }}>
                <Link href="/wounds" style={{ ...navItemStyle, color: pathname === '/wounds' ? '#ff6b6b' : '#999' }}>
                    <span style={{ fontSize: '1.2rem' }}>🏠</span>
                    <span style={{ fontSize: '0.75rem', marginTop: '4px' }}>首頁</span>
                </Link>
                <Link href="/wounds/scan" style={{ ...navItemStyle, color: pathname === '/wounds/scan' ? '#ff6b6b' : '#999' }}>
                    <span style={{ fontSize: '1.2rem' }}>📸</span>
                    <span style={{ fontSize: '0.75rem', marginTop: '4px' }}>照護紀錄</span>
                </Link>
                {/* 
                <Link href="/wounds/admin" style={{ ...navItemStyle, color: pathname.includes('/admin') ? '#ff6b6b' : '#999' }}>
                    <span style={{ fontSize: '1.2rem' }}>👨‍⚕️</span>
                    <span style={{ fontSize: '0.75rem', marginTop: '4px' }}>衛教與商城</span>
                </Link>
                */}
                </nav>
            )}
        </div>
    );
}

const navItemStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textDecoration: 'none',
    width: '33%'
};
