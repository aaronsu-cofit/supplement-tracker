'use client';

import { LanguageProvider } from '@/app/lib/i18n/LanguageContext';
import Navbar from '@/app/components/Navbar';

export default function ClientLayout({ children }) {
    return (
        <LanguageProvider>
            <main>{children}</main>
            <Navbar />
        </LanguageProvider>
    );
}
