'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LanguageProvider } from '@/app/lib/i18n/LanguageContext';
import LiffProvider from '@/app/components/liff/LiffProvider';
import AuthProvider, { useAuth } from '@/app/components/auth/AuthProvider';

// Ensure a user ID cookie exists before any API calls
function ensureUserId() {
    if (typeof document === 'undefined') return;
    const cookies = document.cookie.split(';').map(c => c.trim());
    const existing = cookies.find(c => c.startsWith('supplement_user_id='));
    if (!existing) {
        const id = crypto.randomUUID();
        document.cookie = `supplement_user_id=${id}; path=/; max-age=${60 * 60 * 24 * 365 * 5}; samesite=lax`;
    }
}

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/api'];

function RouteGuard({ children }) {
    const { isAuthenticated, isLoading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r));

    useEffect(() => {
        if (!isLoading && !isAuthenticated && !isPublic) {
            router.replace('/login');
        }
    }, [isLoading, isAuthenticated, isPublic, router]);

    useEffect(() => {
        if (!isLoading && isAuthenticated && pathname === '/login') {
            router.replace('/');
        }
    }, [isLoading, isAuthenticated, pathname, router]);

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f0c29' }}>
                <div style={{
                    width: '40px', height: '40px',
                    border: '3px solid rgba(255,255,255,0.1)',
                    borderTop: '3px solid #7c5cfc',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
            </div>
        );
    }

    if (!isAuthenticated && !isPublic) {
        return null; // Will redirect
    }

    return children;
}

export default function ClientLayout({ children }) {
    useEffect(() => {
        ensureUserId();
    }, []);

    return (
        <LiffProvider>
            <AuthProvider>
                <LanguageProvider>
                    <RouteGuard>
                        {children}
                    </RouteGuard>
                </LanguageProvider>
            </AuthProvider>
        </LiffProvider>
    );
}
