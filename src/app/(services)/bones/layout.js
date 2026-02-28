'use client';
import { usePathname } from 'next/navigation';

export default function BonesLayout({ children }) {
    const pathname = usePathname();

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', minHeight: '100vh',
            background: 'linear-gradient(180deg, #182825 0%, #1a3630 40%, #152b25 100%)', // Distinct greenish-dark theme for bones
            color: '#e8f0eb',
        }}>
            {/* Top Header — for sub pages */}
            {pathname !== '/bones' && (
                <header style={{
                    background: 'rgba(24, 40, 37, 0.85)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    padding: '0.9rem 1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'sticky', top: 0, zIndex: 10,
                }}>
                    <h1 style={{ fontSize: '1rem', margin: 0, fontWeight: 700, letterSpacing: '0.5px' }}>
                        <span style={{
                            background: 'linear-gradient(135deg, #a8ff78, #78ffd6)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>
                            🦴 足踝與骨關節照護
                        </span>
                    </h1>
                </header>
            )}

            {/* Main Content */}
            <main style={{ flex: 1, overflowY: 'auto' }}>
                {children}
            </main>
        </div>
    );
}
