'use client';

export default function IntimacyLayout({ children }) {
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#0a0a12',
            backgroundImage: [
                'radial-gradient(ellipse 70% 40% at 80% 0%, rgba(190, 18, 60, 0.12), transparent)',
                'radial-gradient(ellipse 50% 35% at 0% 100%, rgba(224, 29, 72, 0.07), transparent)',
            ].join(', '),
            color: '#f0f0f5',
        }}>
            {children}
        </div>
    );
}
