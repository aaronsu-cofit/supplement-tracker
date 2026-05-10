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
  { href: "/admins", label: "權限管理" },
  { href: "/manual", label: "操作手冊" },
];

function RouteGuard({ children }) {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r));

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublic) {
      // Redirect unauthenticated users to login
      const redirect = encodeURIComponent(window.location.href);
      router.replace(`/login?redirect=${redirect}`);
    }
  }, [isLoading, isAuthenticated, isPublic, router, pathname]);

  // Redirect authenticated users away from login page
  useEffect(() => {
    if (!isLoading && isAuthenticated && pathname === '/login') {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

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

function SidebarFooter({ collapsed, onLogout }: { collapsed: boolean; onLogout: () => void }) {
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME;
  const sha = process.env.NEXT_PUBLIC_GIT_SHA || '';
  const shortSha = sha ? sha.slice(0, 7) : '';
  if (collapsed) {
    return (
      <div className="hq-sidebar-footer">
        <button
          onClick={onLogout}
          className="w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-sm transition-colors cursor-pointer"
          title="登出"
        >
          登出
        </button>
      </div>
    );
  }
  return (
    <div className="hq-sidebar-footer">
      <button
        onClick={onLogout}
        className="w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-sm transition-colors cursor-pointer mb-3"
      >
        登出
      </button>
      <div className="hq-sidebar-footer-label">部署版本</div>
      <div className="hq-sidebar-footer-row">
        <span>{formatBuildTime(buildTime)}</span>
        {shortSha && <code title={sha}>{shortSha}</code>}
      </div>
    </div>
  );
}

function AppShell({ children, isPublic, onLogout }: { children: React.ReactNode; isPublic: boolean; onLogout: () => void }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

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
        <SidebarFooter collapsed={collapsed} onLogout={onLogout} />
      </aside>
      <main className={`hq-main${isFullPath(pathname) ? ' overflow-hidden flex flex-col h-screen' : ''}`}>
        {isFullPath(pathname) ? children : <div className="hq-content">{children}</div>}
      </main>
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
