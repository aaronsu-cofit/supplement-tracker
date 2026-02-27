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
    const [isLoading, setIsLoading] = useState(true);
    const { profile, isInitialized: liffInitialized, isInLineClient } = useLiff();

    // Check existing session on mount
    useEffect(() => {
        checkSession();
    }, []);

    // Auto-login LINE users when profile becomes available
    useEffect(() => {
        if (liffInitialized && profile && !user) {
            loginWithLine(profile);
        } else if (liffInitialized && !profile && !user) {
            // LIFF initialized but no profile — not in LINE or not logged in
            setIsLoading(false);
        }
    }, [liffInitialized, profile]);

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
            setIsLoading(false);
        }
    };

    const loginWithLine = async (lineProfile) => {
        try {
            const res = await fetch('/api/auth/me', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lineUserId: lineProfile.userId,
                    displayName: lineProfile.displayName,
                    pictureUrl: lineProfile.pictureUrl,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            }
        } catch (err) {
            console.error('LINE login failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

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
