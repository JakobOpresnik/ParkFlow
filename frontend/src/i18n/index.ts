import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import en from './locales/en'
import sl from './locales/sl'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      sl: { translation: sl },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'sl'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'parkflow_language',
    },
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
