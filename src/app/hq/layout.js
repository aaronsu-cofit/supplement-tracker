'use client';

import './hq.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function HQLayout({ children }) {
    const pathname = usePathname();

    const navLinks = [
        { href: '/hq',          label: '總覽 (Overview)' },
        { href: '/hq/modules',  label: '模組設定 (Modules)' },
        { href: '/hq/admins',   label: '管理員權限 (Admins)' },
    ];

    return (
        <div className="hq-layout">
            <aside className="hq-sidebar">
                <div className="hq-brand">
                    <div className="hq-logo">C</div>
                    <h1>HQ Control</h1>
                </div>

                <nav className="hq-nav">
                    {navLinks.map(({ href, label }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`hq-nav-link ${pathname === href ? 'hq-nav-link-active' : ''}`}
                        >
                            {label}
                        </Link>
                    ))}
                    <Link href="/" className="hq-nav-link hq-nav-back">
                        ← 返回前台
                    </Link>
                </nav>
            </aside>

            <main className="hq-main">
                <div className="hq-content">
                    {children}
                </div>
            </main>
        </div>
    );
}
