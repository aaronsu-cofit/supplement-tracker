'use client';
import { usePathname } from 'next/navigation';
import { AppHeader } from '@vitera/ui';

export default function WoundsLayout({ children }) {
    const pathname = usePathname();
    const isAdmin = pathname?.includes('/admin');
    const isDashboard = pathname === '/';
    const isCreate = pathname === '/create';
    const showLayoutHeader = !isAdmin && !isDashboard && !isCreate;

    return (
        <div className="flex flex-col min-h-screen bg-w-app text-[#e8e6f0]">
            {showLayoutHeader && (
                <AppHeader
                    backHref="/"
                    title="傷口智慧照護"
                    accent="linear-gradient(135deg, #ff9a9e, #fda085)"
                />
            )}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
