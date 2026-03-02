'use client';

// A specialized layout for Intimacy module to enforce a dark/intimate theme
// and ensure extreme privacy.

export default function IntimacyLayout({ children }) {
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#FAFAF9',
            backgroundImage: 'radial-gradient(circle at 100% 0%, #FFF0F5 0%, transparent 60%), radial-gradient(circle at 0% 100%, #F0F9FF 0%, transparent 60%)',
            color: '#0F172A',
        }}>
            {children}
        </div>
    );
}
