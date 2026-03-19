'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import zhTW from './zh-TW.json';
import en from './en.json';

const languages = { 'zh-TW': zhTW, en };
const LanguageContext = createContext<{ locale: string; t: (key: string, params?: Record<string, string>) => string; switchLanguage: (lang: string) => void } | undefined>(undefined);

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lang') || 'zh-TW';
    }
    return 'zh-TW';
  });

  const t = useCallback(
    (key: string, params: Record<string, string> = {}) => {
      const keys = key.split('.');
      let value: unknown = languages[locale];
      for (const k of keys) value = (value as Record<string, unknown>)?.[k];
      if (typeof value === 'string' && Object.keys(params).length > 0) {
        return Object.entries(params).reduce((str, [k, v]) => str.replace(`{${k}}`, v), value);
      }
      return (value as string) || key;
    },
    [locale]
  );

  const switchLanguage = useCallback((lang) => {
    setLocale(lang);
    if (typeof window !== 'undefined') localStorage.setItem('lang', lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ locale, t, switchLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
