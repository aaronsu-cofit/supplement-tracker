"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LiffProvider, AuthProvider, useAuth, LanguageProvider } from "@vitera/lib";

const PUBLIC_ROUTES = ['/login'];

const NAV_LINKS = [
  { href: "/", label: "系統總覽" },
  { href: "/oa", label: "LINE OA" },
  { href: "/products", label: "產品" },
  { href: "/admins", label: "人員管理" },
  { href: "/manual", label: "操作手冊" },
];

function RouteGuard({ children }) {
  const { isAuthenticated, isLoading, logout, user, userType } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r));

  useEffect(() => {
    if (!isLoading && !isPublic) {
      // Check authentication
      if (!isAuthenticated) {
        const redirect = encodeURIComponent(window.location.href);
        router.replace(`/login?redirect=${redirect}`);
        return;
      }

      // Check user type: only admin users can access HQ
      if (userType !== 'admin') {
        router.replace('/login');
        return;
      }

      // Check authorization: only admin or superadmin role can access HQ
      if (!user?.role || !['admin', 'superadmin'].includes(user.role)) {
        router.replace('/login');
        return;
      }
    }
  }, [isLoading, isAuthenticated, isPublic, userType, user, router, pathname]);

  // Redirect authenticated admin users away from login page
  useEffect(() => {
    if (!isLoading && isAuthenticated && userType === 'admin' && pathname === '/login') {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, userType, pathname, router]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  // Don't render anything while loading or on public routes
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-9 h-9 rounded-full border-[3px] border-white/10 border-t-white/60 animate-spin" />
      </div>
    );
  }

  // Render with AppShell which handles public vs protected layout
  return <AppShell isPublic={isPublic} onLogout={handleLogout}>{children}</AppShell>;
}

// Pages that want full-height canvas (no hq-content padding wrapper)
function isFullPath(pathname: string): boolean {
  if (pathname === '/wizard') return true;
  if (pathname.startsWith('/oa/')) return true; // /oa/[id] with tabs (including fullscreen wizard tab)
  return false;
}

/** Build-time stamps come from next.config.mjs `env`. They're inlined
 *  at build, so the value is fixed for that deployed bundle. Use Asia/
 *  Taipei because that's the team's working timezone. */
function formatBuildTime(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function SidebarFooter({ collapsed, onLogout, onChangePassword }: { collapsed: boolean; onLogout: () => void; onChangePassword: () => void }) {
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME;
  const sha = process.env.NEXT_PUBLIC_GIT_SHA || '';
  const shortSha = sha ? sha.slice(0, 7) : '';

  const commonBtnClass = "w-full py-2 px-3 rounded-lg text-sm transition-colors cursor-pointer flex items-center justify-center gap-2";

  if (collapsed) {
    return (
      <div className="hq-sidebar-footer space-y-2">
        <button
          onClick={onChangePassword}
          className={`${commonBtnClass} bg-white/5 hover:bg-white/10 text-white/50 hover:text-white`}
          title="修改密碼"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </button>
        <button
          onClick={onLogout}
          className={`${commonBtnClass} bg-white/10 hover:bg-white/20 text-white/70 hover:text-white`}
          title="登出"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="hq-sidebar-footer">
      <button
        onClick={onChangePassword}
        className={`${commonBtnClass} bg-white/5 hover:bg-white/10 text-white/50 hover:text-white mb-2`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
        修改個人密碼
      </button>
      <button
        onClick={onLogout}
        className={`${commonBtnClass} bg-white/10 hover:bg-white/20 text-white/70 hover:text-white mb-4`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        登出系統
      </button>
      <div className="hq-sidebar-footer-label">部署版本</div>
      <div className="hq-sidebar-footer-row">
        <span>{formatBuildTime(buildTime)}</span>
        {shortSha && <code title={sha}>{shortSha}</code>}
      </div>
    </div>
  );
}

function PasswordChangeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      // Use the generic apiFetch if available, or the one from lib
      const { apiFetch: libApiFetch } = await import('@vitera/lib');
      const res = await libApiFetch('/api/hq/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '密碼更新失敗');
        return;
      }
      setSuccess(true);
      setForm({ oldPassword: '', newPassword: '' });
      setTimeout(onClose, 2000);
    } catch (err) {
      setError('網路錯誤，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-slate-100 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800">修改個人密碼</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">{error}</div>}

        {success ? (
          <div className="py-10 text-center">
            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-slate-800">密碼更新成功</h4>
            <p className="text-slate-500 text-sm mt-1">視窗將自動關閉</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">目前密碼</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="輸入目前密碼"
                value={form.oldPassword}
                onChange={e => setForm({ ...form, oldPassword: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7c5cfc] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">新密碼</label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="輸入新密碼 (至少 6 個字元)"
                value={form.newPassword}
                onChange={e => setForm({ ...form, newPassword: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7c5cfc] transition-colors"
              />
            </div>
            <div className="pt-4 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer">取消</button>
              <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#7c5cfc] rounded-lg hover:bg-[#6d4df5] shadow-lg shadow-[#7c5cfc]/20 disabled:opacity-50 cursor-pointer">
                {isSubmitting ? '更新中...' : '確認更新'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function AppShell({ children, isPublic, onLogout }: { children: React.ReactNode; isPublic: boolean; onLogout: () => void }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Don't show sidebar on public routes (like login)
  if (isPublic) {
    return children;
  }

  return (
    <div className="hq-layout">
      <aside className={`hq-sidebar${collapsed ? " hq-sidebar-collapsed" : ""}`}>
        <div className="hq-brand">
          <div className="hq-logo">H</div>
          {!collapsed && <h1>Vitera HQ</h1>}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="hq-sidebar-toggle"
            aria-label={collapsed ? "展開側欄" : "收合側欄"}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>
        {!collapsed && (
          <nav className="hq-nav">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`hq-nav-link ${pathname === link.href ? "hq-nav-link-active" : ""}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
        <SidebarFooter 
          collapsed={collapsed} 
          onLogout={onLogout} 
          onChangePassword={() => setIsPasswordModalOpen(true)}
        />
      </aside>
      <main className={`hq-main${isFullPath(pathname) ? ' overflow-hidden flex flex-col h-screen' : ''}`}>
        {isFullPath(pathname) ? children : <div className="hq-content">{children}</div>}
      </main>

      <PasswordChangeModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
    </div>
  );
}

export default function ClientLayout({ children }) {
  return (
    <LiffProvider liffId="">
      <AuthProvider>
        <LanguageProvider>
          <RouteGuard>{children}</RouteGuard>
        </LanguageProvider>
      </AuthProvider>
    </LiffProvider>
  );
}
