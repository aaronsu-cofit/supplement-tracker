'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/app/lib/i18n/LanguageContext';

export default function Navbar() {
    const pathname = usePathname();
    const { t } = useLanguage();

    const links = [
        { href: '/', icon: '✅', label: t('nav.home') },
        { href: '/supplements', icon: '💊', label: t('nav.supplements') },
        { href: '/history', icon: '📊', label: t('nav.history') },
    ];

    return (
        <nav className="bottom-nav">
            <div className="nav-links">
                {links.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`nav-link ${pathname === link.href ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{link.icon}</span>
                        {link.label}
                    </Link>
                ))}
            </div>
        </nav>
    );
}
