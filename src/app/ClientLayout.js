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

    // ✨ PERFORMANCE OPTIMIZATION: 
    // We no longer block the entire React Tree when authenticating.
    // This allows the Module Layouts (Headers, Navbars) to instantly paint (Skeleton Mode).
    // Individual pages use `const { isLoading } = useAuth()` to show localized spinners.

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
