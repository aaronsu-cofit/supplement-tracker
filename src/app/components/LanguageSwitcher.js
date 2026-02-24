'use client';

import { useLanguage } from '@/app/lib/i18n/LanguageContext';

export default function LanguageSwitcher() {
    const { locale, switchLanguage } = useLanguage();

    const toggleLanguage = () => {
        switchLanguage(locale === 'zh-TW' ? 'en' : 'zh-TW');
    };

    return (
        <div className="lang-switcher">
            <button className="lang-btn" onClick={toggleLanguage}>
                {locale === 'zh-TW' ? 'EN' : '中文'}
            </button>
        </div>
    );
}
