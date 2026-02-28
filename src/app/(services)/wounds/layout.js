'use client';
import { usePathname } from 'next/navigation';

export default function WoundsLayout({ children }) {
    const pathname = usePathname();
    const isAdmin = pathname?.includes('/admin');

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', minHeight: '100vh',
            background: 'linear-gradient(180deg, #1a1225 0%, #1e1530 40%, #16202e 100%)',
            color: '#e8e6f0',
        }}>
            {/* Top Header — only non-admin, non-dashboard pages */}
            {!isAdmin && !['', '/wounds'].includes(pathname?.replace(/\/wounds\/\d+.*/, '')) && pathname !== '/wounds' && pathname !== '/wounds/create' && (
                <header style={{
                    background: 'rgba(26, 18, 37, 0.85)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    padding: '0.9rem 1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'sticky', top: 0, zIndex: 10,
                }}>
                    <h1 style={{ fontSize: '1rem', margin: 0, fontWeight: 700, letterSpacing: '0.5px' }}>
                        <span style={{
                            background: 'linear-gradient(135deg, #ff9a9e, #fda085)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>
                            🩹 傷口智慧照護
                        </span>
                    </h1>
                </header>
            )}

            {/* Main Content — no bottom padding since no nav */}
            <main style={{ flex: 1, overflowY: 'auto' }}>
                {children}
            </main>
        </div>
    );
}
