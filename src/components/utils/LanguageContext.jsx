import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';

const translations = {
  en: {
    'app.title': 'Guitar Studio Hub',
    'nav.dashboard': 'Dashboard',
    'nav.students': 'Students',
    'nav.materials': 'Materials',
    'nav.tasks': 'Tasks',
    'nav.practice': 'Practice',
    'nav.practiceRoom': 'Practice Room',
    'nav.progress': 'Progress',
    'nav.chat': 'Chat',
    'nav.settings': 'Settings',
    'nav.recommendations': 'Recommendations',
    'nav.logout': 'Logout',
    'common.save': 'Save',
    'common.loading': 'Loading...',
    'common.language': 'Language',
    'common.level': 'Level',
    'settings.title': 'Settings',
    'settings.profileSettings': 'Profile Settings',
    'settings.fullName': 'Full Name',
    'settings.phone': 'Phone',
    'settings.mainStyle': 'Main Style',
  },
  he: {
    'app.title': 'Guitar Studio Hub',
    'nav.dashboard': 'דשבורד',
    'nav.students': 'תלמידים',
    'nav.materials': 'חומרים',
    'nav.tasks': 'משימות',
    'nav.practice': 'תרגול',
    'nav.practiceRoom': 'חדר תרגול',
    'nav.progress': 'התקדמות',
    'nav.chat': 'צ\'אט',
    'nav.settings': 'הגדרות',
    'nav.recommendations': 'המלצות',
    'nav.logout': 'התנתק',
    'common.save': 'שמור',
    'common.loading': 'טוען...',
    'common.language': 'שפה',
    'common.level': 'רמה',
    'settings.title': 'הגדרות',
    'settings.profileSettings': 'הגדרות פרופיל',
    'settings.fullName': 'שם מלא',
    'settings.phone': 'טלפון',
    'settings.mainStyle': 'סגנון עיקרי',
  }
};

const LanguageContext = createContext(undefined);

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState('en');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('guitarStudioHub.lang');
      if (stored === 'en' || stored === 'he') {
        setLangState(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const setLang = useCallback((newLang) => {
    setLangState(newLang);
    try {
      window.localStorage.setItem('guitarStudioHub.lang', newLang);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback((key) => {
    const dict = translations[lang];
    if (dict && key in dict) return dict[key];
    const fallback = translations.en;
    if (fallback && key in fallback) return fallback[key];
    return key;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return (
    <LanguageContext.Provider value={value}>
      <div dir={lang === 'he' ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside LanguageProvider');
  }
  return ctx;
}