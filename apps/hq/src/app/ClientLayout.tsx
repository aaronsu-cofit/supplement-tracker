"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@vitera/lib";

const NAV_LINKS = [
  { href: "/", label: "系統總覽" },
  { href: "/oa", label: "LINE OA" },
  { href: "/admins", label: "管理員" },
];

// Pages that want full-height canvas (no hq-content padding wrapper)
function isFullPath(pathname: string): boolean {
  if (pathname === '/wizard') return true;
  if (pathname.startsWith('/oa/')) return true; // /oa/[id] with tabs (including fullscreen wizard tab)
  return false;
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
      </aside>
      <main className={`hq-main${isFullPath(pathname) ? ' overflow-hidden flex flex-col' : ''}`}>
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
