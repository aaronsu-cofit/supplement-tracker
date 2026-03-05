'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/app/lib/i18n/LanguageContext';
import { IconCheckCircle, IconPill, IconClock } from '@/app/components/icons';

export default function Navbar() {
    const pathname = usePathname();
    const { t } = useLanguage();

    const links = [
        { href: '/supplements',         icon: IconCheckCircle, label: t('nav.home') },
        { href: '/supplements/manage',  icon: IconPill,        label: t('nav.supplements') },
        { href: '/supplements/history', icon: IconClock,       label: t('nav.history') },
    ];

    return (
        <nav className="bottom-nav">
            <div className="nav-links">
                {links.map(({ href, icon: Icon, label }) => {
                    const active = pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`nav-link ${active ? 'active' : ''}`}
                        >
                            <span className="nav-icon">
                                <Icon size={22} />
                            </span>
                            {label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
