'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';

export const LiffContext = createContext({
    liff: null,
    profile: null,
    isInitialized: false,
    error: null
});

export function useLiff() {
    return useContext(LiffContext);
}

export default function LiffProvider({ children }) {
    const [liffState, setLiffState] = useState({
        liff: null,
        profile: null,
        isInitialized: false,
        error: null
    });
    const pathname = usePathname();

    useEffect(() => {
        let isMounted = true;

        const initLiff = async () => {
            try {
                // Determine which LIFF ID to use based on the route
                let liffId = process.env.NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS; // Default fallback

                if (pathname.startsWith('/wounds')) {
                    liffId = process.env.NEXT_PUBLIC_LIFF_ID_WOUNDS;
                } else if (pathname.startsWith('/bones')) {
                    liffId = process.env.NEXT_PUBLIC_LIFF_ID_BONES;
                } else if (pathname.startsWith('/supplements')) {
                    liffId = process.env.NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS;
                }

                // If no LIFF ID is configured, we skip initialization (e.g., local dev without env vars)
                if (!liffId) {
                    console.log('No LIFF ID found in env, skipping LIFF initialization.');
                    if (isMounted) {
                        setLiffState(prev => ({ ...prev, isInitialized: true }));
                    }
                    return;
                }

                const liff = (await import('@line/liff')).default;

                await liff.init({ liffId });

                if (isMounted) {
                    if (liff.isLoggedIn()) {
                        const profile = await liff.getProfile();
                        // Store the true LINE User ID in cookies so APIs can use it
                        document.cookie = `line_user_id=${profile.userId}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
                        setLiffState({ liff, profile, isInitialized: true, error: null });
                    } else {
                        // In production, we typically redirect to login or show a button
                        // liff.login(); 
                        setLiffState({ liff, profile: null, isInitialized: true, error: null });
                    }
                }
            } catch (error) {
                console.error('LIFF init failed', error);
                if (isMounted) {
                    setLiffState(prev => ({ ...prev, error, isInitialized: true }));
                }
            }
        };

        if (typeof window !== 'undefined') {
            initLiff();
        }

        return () => { isMounted = false; };
    }, [pathname]);

    return (
        <LiffContext.Provider value={liffState}>
            {children}
        </LiffContext.Provider>
    );
}
