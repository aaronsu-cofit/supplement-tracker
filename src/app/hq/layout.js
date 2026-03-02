'use client';

import './hq.css';
import Link from 'next/link';

// A high-tech, dark theme SaaS layout designed specifically for the Super Admin Control Center.
export default function HQLayout({ children }) {
    return (
        <div className="hq-layout">
            {/* Sidebar */}
            <aside className="hq-sidebar">
                <div className="hq-brand">
                    <div className="hq-logo">C</div>
                    <h1>HQ Control</h1>
                </div>

                <nav className="hq-nav">
                    <Link href="/hq" className="hq-nav-link">
                        總覽 (Overview)
                    </Link>
                    <Link href="/hq/modules" className="hq-nav-link">
                        模組設定 (Modules)
                    </Link>
                    <Link href="/hq/admins" className="hq-nav-link">
                        管理員權限 (Admins)
                    </Link>
                    <Link href="/" className="hq-nav-link hq-nav-back">
                        ← 返回前台
                    </Link>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="hq-main">
                <div className="hq-content">
                    {children}
                </div>
            </main>
        </div>
    );
}
