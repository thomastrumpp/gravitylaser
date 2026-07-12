import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import deTranslation from './locales/de.json';
import enTranslation from './locales/en.json';
import esTranslation from './locales/es.json';
import ruTranslation from './locales/ru.json';
import zhTranslation from './locales/zh.json';

const resources = {
  de: {
    translation: deTranslation,
  },
  en: {
    translation: enTranslation,
  },
  es: {
    translation: esTranslation,
  },
  ru: {
    translation: ruTranslation,
  },
  zh: {
    translation: zhTranslation,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'de',
    debug: false,
    interpolation: {
      escapeValue: false, // React schützt bereits vor XSS
    },
    detection: {
      order: ['navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'],
    },
  });

export default i18n;
