'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLiff } from '../liff/LiffProvider';
import { apiFetch } from '../api';

const AuthContext = createContext<{
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null);
  const [isSessionChecked, setIsSessionChecked] = useState(false);
  const [isLineLoginFinished, setIsLineLoginFinished] = useState(false);
  const { profile, isInitialized: liffInitialized, isInLineClient } = useLiff();

  // Check existing session on mount (reads auth_token cookie via backend)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await apiFetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) setUser(data.user);
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

    if (profile && profile.userId && !user) {
      const loginWithLine = async () => {
        try {
          const res = await apiFetch('/api/auth/me', {
            method: 'POST',
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
      setIsLineLoginFinished(true);
    }
  }, [liffInitialized, profile]); // intentionally excluded user

  const isLoading = !isSessionChecked || !liffInitialized || !isLineLoginFinished;

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/me', { method: 'DELETE' });
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
