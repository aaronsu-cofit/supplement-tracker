'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import zhTW from './zh-TW.json' assert { type: 'json' };
import en from './en.json' assert { type: 'json' };

const languages = { 'zh-TW': zhTW, en };
const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lang') || 'zh-TW';
    }
    return 'zh-TW';
  });

  const t = useCallback(
    (key, params = {}) => {
      const keys = key.split('.');
      let value = languages[locale];
      for (const k of keys) value = value?.[k];
      if (typeof value === 'string' && Object.keys(params).length > 0) {
        return Object.entries(params).reduce((str, [k, v]) => str.replace(`{${k}}`, v), value);
      }
      return value || key;
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
