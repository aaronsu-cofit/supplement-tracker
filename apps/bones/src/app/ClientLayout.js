"use client";

import { useEffect } from "react";
import {
  LanguageProvider,
  LiffProvider,
  AuthProvider,
  useAuth,
} from "@vitera/lib";

const LOGIN_URL = process.env.NEXT_PUBLIC_LOGIN_URL;

function RouteGuard({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) return;
    const redirect = encodeURIComponent(window.location.href);
    window.location.href = `${LOGIN_URL}?redirect=${redirect}`;
  }, [isAuthenticated, isLoading]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-9 h-9 rounded-full border-[3px] border-white/10 border-t-white/60 animate-spin" />
      </div>
    );
  }

  return children;
}

export default function ClientLayout({ children }) {
  return (
    <LiffProvider>
      <AuthProvider>
        <LanguageProvider>
          <RouteGuard>{children}</RouteGuard>
        </LanguageProvider>
      </AuthProvider>
    </LiffProvider>
  );
}
