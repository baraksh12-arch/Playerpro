import React from 'react';
import { useI18n } from './i18n/LanguageContext.tsx';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC = () => {
  const { lang, setLang, t } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-gray-500" />
      <span className="text-sm text-gray-600">{t('common.language')}:</span>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
          lang === 'en'
            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('he')}
        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
          lang === 'he'
            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        עב
      </button>
    </div>
  );
};