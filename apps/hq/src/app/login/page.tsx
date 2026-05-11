'use client';

import { useState } from 'react';
import { useAuth } from '@vitera/lib';

/**
 * Allowed origins for redirect after login.
 * Add production domains here when deploying.
 */
const ALLOWED_REDIRECT_ORIGINS = (
  process.env.NEXT_PUBLIC_ALLOWED_REDIRECT_ORIGINS || ''
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Always allow localhost in development
if (process.env.NODE_ENV !== 'production') {
  for (let port = 3000; port <= 3010; port++) {
    ALLOWED_REDIRECT_ORIGINS.push(`http://localhost:${port}`);
  }
}

function getSafeRedirectUrl() {
  if (typeof window === 'undefined') return '/';
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');
  if (!redirect) return '/';
  try {
    const url = new URL(redirect);
    if (ALLOWED_REDIRECT_ORIGINS.includes(url.origin)) return redirect;
  } catch {}
  return '/';
}

export default function LoginPage() {
    const { loginAsAdmin, isLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await loginAsAdmin(email, password);
            window.location.href = getSafeRedirectUrl();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0c29] via-[#1a1a2e] to-[#16213e]">
                <div className="w-10 h-10 rounded-full border-[3px] border-white/10 border-t-[#7c5cfc] animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0c29] via-[#1a1a2e] to-[#16213e] p-4">
            <div className="bg-white/5 backdrop-blur-[20px] border border-white/10 rounded-[24px] p-10 w-full max-w-[400px] shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                {/* Logo / Header */}
                <div className="text-center mb-8">
                    <div className="text-[3rem] mb-2">⚙️</div>
                    <h1 className="text-white text-[1.5rem] font-bold m-0 mb-[0.3rem]">HQ 後台管理</h1>
                    <p className="text-white/60 text-[0.9rem] m-0">請登入管理員帳號</p>
                </div>

                {/* Email Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-[0.3rem]">
                        <label className="text-white/70 text-[0.85rem] font-medium">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="example@email.com"
                            required
                            className="px-4 py-[0.8rem] bg-white/[0.07] border border-white/15 rounded-[10px] text-white text-[1rem] outline-none transition-colors duration-150 focus:border-[#7c5cfc] placeholder:text-white/30"
                        />
                    </div>
                    <div className="flex flex-col gap-[0.3rem]">
                        <label className="text-white/70 text-[0.85rem] font-medium">密碼</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="至少 8 位數"
                            minLength={8}
                            required
                            className="px-4 py-[0.8rem] bg-white/[0.07] border border-white/15 rounded-[10px] text-white text-[1rem] outline-none transition-colors duration-150 focus:border-[#7c5cfc] placeholder:text-white/30"
                        />
                    </div>

                    {error && (
                        <div className="bg-[rgba(255,107,107,0.15)] border border-[rgba(255,107,107,0.3)] rounded-[8px] px-4 py-[0.7rem] text-[#ff6b6b] text-[0.85rem]">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className={`mt-2 py-[0.9rem] bg-gradient-to-br from-[#7c5cfc] to-[#5ce0d8] text-white border-none rounded-[12px] text-[1rem] font-bold cursor-pointer transition-all duration-200 hover:-translate-y-px ${submitting ? 'opacity-70' : 'opacity-100'}`}
                    >
                        {submitting ? '處理中...' : '登入'}
                    </button>
                </form>
            </div>
        </div>
    );
}
