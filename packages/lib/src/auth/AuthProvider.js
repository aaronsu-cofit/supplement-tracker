'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLiff } from '../liff/LiffProvider.js';
import { apiFetch, setAuthToken, clearAuthToken } from '../api.js';

const AuthContext = createContext({
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

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isSessionChecked, setIsSessionChecked] = useState(false);
  const [isLineLoginFinished, setIsLineLoginFinished] = useState(false);
  const { profile, isInitialized: liffInitialized, isInLineClient } = useLiff();

  // Check existing session on mount
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

    if (profile && !user) {
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
            if (data.token) setAuthToken(data.token);
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

  const login = useCallback(async (email, password) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (data.token) setAuthToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (email, password, displayName) => {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (data.token) setAuthToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/me', { method: 'DELETE' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    clearAuthToken();
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
