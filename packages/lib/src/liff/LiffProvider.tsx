'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export const LiffContext = createContext({
  liff: null,
  profile: null,
  isInitialized: false,
  isInLineClient: false,
  error: null,
});

export function useLiff() {
  return useContext(LiffContext);
}

export default function LiffProvider({ children, liffId: propLiffId }) {
  const [liffState, setLiffState] = useState({
    liff: null,
    profile: null,
    isInitialized: false,
    isInLineClient: false,
    error: null,
  });
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const initLiff = async () => {
      try {
        // Use prop liffId or NEXT_PUBLIC_LIFF_ID env var (one per app)
        const liffId = propLiffId || process.env.NEXT_PUBLIC_LIFF_ID || null;

        if (!liffId) {
          console.log('No LIFF ID found, skipping LIFF initialization.');
          if (isMounted) setLiffState(prev => ({ ...prev, isInitialized: true }));
          return;
        }

        const liff = (await import('@line/liff')).default;

        const searchParams = new URL(window.location.href).searchParams;
        let targetPath = searchParams.get('path');
        let rawState = searchParams.get('liff.state');
        const hashParam = window.location.hash;
        let hashPath = null;
        if (hashParam?.includes('path=')) {
          const pathMatch = hashParam.match(/path=([^&#]+)/);
          if (pathMatch?.[1]) hashPath = decodeURIComponent(pathMatch[1]);
        }
        if (!targetPath) {
          if (hashPath) targetPath = hashPath;
          else if (rawState) {
            try {
              const parsedState = new URLSearchParams(rawState.includes('?') ? rawState.substring(rawState.indexOf('?')) : '?' + rawState);
              targetPath = parsedState.get('path');
            } catch {
              if (rawState.includes('path=')) targetPath = rawState.split('path=')[1].split('&')[0];
              else targetPath = rawState;
            }
          }
        }
        if (!targetPath) {
          const pathMatch = window.location.href.match(/[?&]path=([^&]+)/);
          if (pathMatch) targetPath = decodeURIComponent(pathMatch[1]);
        }

        await liff.init({ liffId });

        if (isMounted) {
          const inLineClient = liff.isInClient();
          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            document.cookie = `line_user_id=${profile.userId}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
            setLiffState({ liff, profile, isInitialized: true, isInLineClient: inLineClient, error: null });
            if (targetPath?.startsWith('/') && pathname !== targetPath) {
              setTimeout(() => router.replace(targetPath), 50);
            }
          } else if (inLineClient) {
            liff.login({ redirectUri: window.location.href });
            setLiffState({ liff, profile: null, isInitialized: true, isInLineClient: true, error: null });
          } else {
            setLiffState({ liff, profile: null, isInitialized: true, isInLineClient: false, error: null });
            if (targetPath?.startsWith('/') && pathname !== targetPath) {
              setTimeout(() => router.replace(targetPath), 50);
            }
          }
        }
      } catch (error) {
        console.error('LIFF init failed', error);
        if (isMounted) setLiffState(prev => ({ ...prev, error, isInitialized: true }));
      }
    };

    if (typeof window !== 'undefined') initLiff();
    return () => { isMounted = false; };
  }, []);

  return <LiffContext.Provider value={liffState}>{children}</LiffContext.Provider>;
}
