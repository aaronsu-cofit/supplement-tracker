'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLiff } from '@/app/components/liff/LiffProvider';

const AuthContext = createContext({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    login: async () => { },
    register: async () => { },
    logout: async () => { },
});

export function useAuth() {
    return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isSessionChecked, setIsSessionChecked] = useState(false);
    const [isLineLoginFinished, setIsLineLoginFinished] = useState(false);
    const { profile, isInitialized: liffInitialized, isInLineClient } = useLiff();

    // Check existing session on mount
    useEffect(() => {
        const checkSession = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    if (data.authenticated) {
                        setUser(data.user);
                    }
                }
            } catch (err) {
                console.error('Session check failed:', err);
            } finally {
                setIsSessionChecked(true);
            }
        };
        checkSession();
    }, []);

    // Auto-login LINE users when profile becomes available
    useEffect(() => {
        if (!liffInitialized) return;

        if (profile && !user) {
            const loginWithLine = async () => {
                try {
                    const res = await fetch('/api/auth/me', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            lineUserId: profile.userId,
                            displayName: profile.displayName,
                            pictureUrl: profile.pictureUrl,
                        }),
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setUser(data.user);
                    }
                } catch (err) {
                    console.error('LINE login failed:', err);
                } finally {
                    setIsLineLoginFinished(true);
                }
            };
            loginWithLine();
        } else {
            // Either we already have a user from checkSession, or we aren't in LINE
            setIsLineLoginFinished(true);
        }
    }, [liffInitialized, profile]); // intentionally excluded user to prevent re-running loop

    const isLoading = !isSessionChecked || !liffInitialized || !isLineLoginFinished;

    const login = useCallback(async (email, password) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setUser(data.user);
        return data;
    }, []);

    const register = useCallback(async (email, password, displayName) => {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, displayName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setUser(data.user);
        return data;
    }, []);

    const logout = useCallback(async () => {
        try {
            await fetch('/api/auth/me', { method: 'DELETE' });
        } catch (err) {
            console.error('Logout error:', err);
        }
        setUser(null);
    }, []);

    const value = {
        user,
        isAuthenticated: !!user,
        isLoading,
        isInLineClient,
        login,
        register,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
