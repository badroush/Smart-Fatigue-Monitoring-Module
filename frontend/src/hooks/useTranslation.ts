import { useState, useEffect } from 'react';
import fr from '../locales/fr.json';
import en from '../locales/en.json';
import ar from '../locales/ar.json';

const translations: Record<string, any> = { fr, en, ar };

export const useTranslation = () => {
  const [lang, setLang] = useState('fr');
  const [t, setT] = useState<any>(fr);

  useEffect(() => {
    const saved = localStorage.getItem('sfam-lang') || 'fr';
    setLang(saved);
    setT(translations[saved] || fr);
  }, []);

  const changeLanguage = (newLang: string) => {
    localStorage.setItem('sfam-lang', newLang);
    setLang(newLang);
    setT(translations[newLang] || fr);
  };

  return { t, lang, changeLanguage };
};