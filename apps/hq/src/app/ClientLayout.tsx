"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@vitera/lib";

const NAV_LINKS = [
  { href: "/", label: "總覽 Overview" },
  { href: "/modules", label: "模組管理 Modules" },
  { href: "/admins", label: "管理員 Admins" },
  { href: "/lineoamenu", label: "LINE OA 選單" },
  { href: "/wizard", label: "CoBlocks Wizard" },
];

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
            <a
              href={process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:3000"}
              className="hq-nav-link hq-nav-back"
            >
              ← 回 Portal
            </a>
          </nav>
        )}
      </aside>
      <main className={`hq-main${pathname === '/wizard' ? ' overflow-hidden flex flex-col' : ''}`}>
        {pathname === '/wizard' ? children : <div className="hq-content">{children}</div>}
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
