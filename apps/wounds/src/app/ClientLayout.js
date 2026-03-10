"use client";

import { useEffect } from "react";
import {
  LanguageProvider,
  LiffProvider,
  AuthProvider,
  useAuth,
} from "@vitera/lib";

const LOGIN_URL =
  process.env.NEXT_PUBLIC_LOGIN_URL || "http://localhost:3000/login";

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
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-9 h-9 border-[3px] border-white/10 border-t-white/60 rounded-full animate-spin" />
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
          <RouteGuard>
            <div className="flex flex-col min-h-screen bg-w-app text-[#e8e6f0]">
              {children}
            </div>
          </RouteGuard>
        </LanguageProvider>
      </AuthProvider>
    </LiffProvider>
  );
}
