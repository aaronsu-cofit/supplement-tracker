'use client';

import { useState } from 'react';
import { useAuth } from '@vitera/lib';
import { useLiff } from '@vitera/lib';

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
    const { login, register, isLoading } = useAuth();
    const { liff, isInitialized } = useLiff();
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleLineLogin = () => {
        if (liff && isInitialized) {
            liff.login();
        } else {
            setError('LINE 登入服務尚未初始化，請稍後再試');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            if (mode === 'register') {
                await register(email, password, displayName);
            } else {
                await login(email, password);
            }
            window.location.href = getSafeRedirectUrl();
        } catch (err) {
            setError(err.message);
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
                    <div className="text-[3rem] mb-2">🏥</div>
                    <h1 className="text-white text-[1.5rem] font-bold m-0 mb-[0.3rem]">Health & Care</h1>
                    <p className="text-white/60 text-[0.9rem] m-0">請登入以使用完整功能</p>
                </div>

                {/* LINE Login Button */}
                <button
                    onClick={handleLineLogin}
                    disabled={!isInitialized}
                    className="w-full py-[0.9rem] bg-[#06C755] text-white border-none rounded-[12px] text-[1rem] font-bold cursor-pointer flex items-center justify-center transition-transform duration-200 hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white" className="mr-2">
                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.064-.023.134-.034.2-.034.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                    </svg>
                    使用 LINE 帳號登入
                </button>

                {/* Divider */}
                <div className="flex items-center my-6 gap-[0.8rem]">
                    <span className="flex-1 h-px bg-white/15" />
                    <span className="text-white/40 text-[0.85rem]">或</span>
                    <span className="flex-1 h-px bg-white/15" />
                </div>

                {/* Mode Toggle */}
                <div className="flex bg-white/5 rounded-[10px] p-1 mb-6">
                    <button
                        onClick={() => { setMode('login'); setError(''); }}
                        className={`flex-1 py-[0.6rem] rounded-[8px] text-[0.9rem] cursor-pointer transition-all duration-150 ${
                            mode === 'login'
                                ? 'bg-[rgba(124,92,252,0.3)] border border-[rgba(124,92,252,0.5)] text-white font-bold'
                                : 'bg-transparent border border-transparent text-white/50'
                        }`}
                    >
                        登入
                    </button>
                    <button
                        onClick={() => { setMode('register'); setError(''); }}
                        className={`flex-1 py-[0.6rem] rounded-[8px] text-[0.9rem] cursor-pointer transition-all duration-150 ${
                            mode === 'register'
                                ? 'bg-[rgba(124,92,252,0.3)] border border-[rgba(124,92,252,0.5)] text-white font-bold'
                                : 'bg-transparent border border-transparent text-white/50'
                        }`}
                    >
                        註冊
                    </button>
                </div>

                {/* Email Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {mode === 'register' && (
                        <div className="flex flex-col gap-[0.3rem]">
                            <label className="text-white/70 text-[0.85rem] font-medium">顯示名稱</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="輸入您的暱稱"
                                className="px-4 py-[0.8rem] bg-white/[0.07] border border-white/15 rounded-[10px] text-white text-[1rem] outline-none transition-colors duration-150 focus:border-[#7c5cfc] placeholder:text-white/30"
                            />
                        </div>
                    )}
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
                        {submitting ? '處理中...' : mode === 'register' ? '註冊帳號' : '登入'}
                    </button>
                </form>
            </div>
        </div>
    );
}
