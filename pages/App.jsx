import React from 'react';
import { LanguageProvider } from '@/components/i18n/LanguageContext.jsx';

export default function App({ children }) {
  return (
    <LanguageProvider>
      {children}
    </LanguageProvider>
  );
}