import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import mk from '../locales/mk.json'
import en from '../locales/en.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { mk: { translation: mk }, en: { translation: en } },
    fallbackLng: 'mk',
    supportedLngs: ['mk', 'en'],
    lng: 'mk',
    detection: { order: ['localStorage'], caches: ['localStorage'], lookupLocalStorage: 'stgs_lang' },
    interpolation: { escapeValue: false },
  })

export default i18n
