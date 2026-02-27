'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function WoundsLayout({ children }) {
    const pathname = usePathname();
    const isAdmin = pathname?.includes('/admin');

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', minHeight: '100vh',
            background: 'linear-gradient(180deg, #1a1225 0%, #1e1530 40%, #16202e 100%)',
            color: '#e8e6f0',
        }}>
            {/* Top Header */}
            {!isAdmin && (
                <header style={{
                    background: 'rgba(26, 18, 37, 0.85)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    padding: '0.9rem 1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
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

            {/* Main Content Area */}
            <main style={{ flex: 1, paddingBottom: isAdmin ? '0' : '80px', overflowY: 'auto' }}>
                {children}
            </main>

            {/* Bottom Navigation */}
            {!isAdmin && (
                <nav style={{
                    position: 'fixed',
                    bottom: 0,
                    width: '100%',
                    background: 'rgba(26, 18, 37, 0.9)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    justifyContent: 'space-around',
                    padding: '0.6rem 0 0.3rem',
                    paddingBottom: 'max(env(safe-area-inset-bottom), 0.6rem)',
                    zIndex: 10,
                }}>
                    <NavItem href="/wounds" label="首頁" icon="🏠" active={pathname === '/wounds'} />
                    <NavItem href="/wounds/scan" label="照護紀錄" icon="📸" active={pathname === '/wounds/scan'} />
                    <NavItem href="/wounds/history" label="歷程" icon="📅" active={pathname === '/wounds/history'} />
                </nav>
            )}
        </div>
    );
}

function NavItem({ href, label, icon, active }) {
    return (
        <Link href={href} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textDecoration: 'none',
            width: '33%',
            gap: '2px',
            color: active ? '#ff9a9e' : 'rgba(255,255,255,0.4)',
            transition: 'color 0.2s',
        }}>
            <span style={{
                fontSize: '1.3rem',
                filter: active ? 'drop-shadow(0 0 6px rgba(255,154,158,0.5))' : 'none',
                transition: 'filter 0.2s, transform 0.2s',
                transform: active ? 'scale(1.1)' : 'scale(1)',
            }}>{icon}</span>
            <span style={{
                fontSize: '0.7rem',
                fontWeight: active ? 700 : 400,
                letterSpacing: '0.3px',
            }}>{label}</span>
        </Link>
    );
}
