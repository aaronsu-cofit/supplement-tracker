'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';

export const LiffContext = createContext({
    liff: null,
    profile: null,
    isInitialized: false,
    isInLineClient: false,
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
        isInLineClient: false,
        error: null
    });
    const pathname = usePathname();

    useEffect(() => {
        let isMounted = true;

        const initLiff = async () => {
            try {
                // Determine which LIFF ID to use based on the route
                // Try route-specific first, then fall back to any available ID
                const allIds = {
                    wounds: process.env.NEXT_PUBLIC_LIFF_ID_WOUNDS,
                    bones: process.env.NEXT_PUBLIC_LIFF_ID_BONES,
                    supplements: process.env.NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS,
                };

                let liffId = null;
                if (pathname.startsWith('/wounds') && allIds.wounds) {
                    liffId = allIds.wounds;
                } else if (pathname.startsWith('/bones') && allIds.bones) {
                    liffId = allIds.bones;
                } else if (pathname.startsWith('/supplements') && allIds.supplements) {
                    liffId = allIds.supplements;
                }

                // Fallback: use any available LIFF ID (needed for /login, /, etc.)
                if (!liffId) {
                    liffId = allIds.supplements || allIds.wounds || allIds.bones;
                }

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
                    const inLineClient = liff.isInClient();
                    if (liff.isLoggedIn()) {
                        const profile = await liff.getProfile();
                        // Store the true LINE User ID in cookies so APIs can use it
                        document.cookie = `line_user_id=${profile.userId}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
                        setLiffState({ liff, profile, isInitialized: true, isInLineClient: inLineClient, error: null });
                    } else if (inLineClient) {
                        // Only auto-login inside LINE's in-app browser
                        liff.login({ redirectUri: window.location.href });
                        setLiffState({ liff, profile: null, isInitialized: true, isInLineClient: true, error: null });
                    } else {
                        // Regular browser — skip login, run in guest mode
                        setLiffState({ liff, profile: null, isInitialized: true, isInLineClient: false, error: null });
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
