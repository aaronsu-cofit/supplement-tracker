"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@vitera/lib";

const NAV_LINKS = [
  { href: "/", label: "系統總覽" },
  { href: "/oa", label: "LINE OA" },
  { href: "/products", label: "產品" },
  { href: "/admins", label: "權限管理" },
  { href: "/manual", label: "操作手冊" },
];

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

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME;
  const sha = process.env.NEXT_PUBLIC_GIT_SHA || '';
  const shortSha = sha ? sha.slice(0, 7) : '';
  if (collapsed) {
    return (
      <div className="hq-sidebar-footer" title={`部署時間：${formatBuildTime(buildTime)}${sha ? ` · ${shortSha}` : ''}`}>
        <div style={{ textAlign: 'center', fontSize: 10 }}>v</div>
      </div>
    );
  }
  return (
    <div className="hq-sidebar-footer">
      <div className="hq-sidebar-footer-label">部署版本</div>
      <div className="hq-sidebar-footer-row">
        <span>{formatBuildTime(buildTime)}</span>
        {shortSha && <code title={sha}>{shortSha}</code>}
      </div>
    </div>
  );
}

function AppShell({ children }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

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
        <SidebarFooter collapsed={collapsed} />
      </aside>
      <main className={`hq-main${isFullPath(pathname) ? ' overflow-hidden flex flex-col h-screen' : ''}`}>
        {isFullPath(pathname) ? children : <div className="hq-content">{children}</div>}
      </main>
    </div>
  );
}

export default function ClientLayout({ children }) {
  return (
    <AppLayout lineOnly>
      <AppShell>{children}</AppShell>
    </AppLayout>
  );
}
