import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import commonEn from './locales/en/common.json'
import homeEn from './locales/en/home.json'
import canvasEn from './locales/en/canvas.json'
import chatEn from './locales/en/chat.json'
import settingsEn from './locales/en/settings.json'

import commonZh from './locales/zh-CN/common.json'
import homeZh from './locales/zh-CN/home.json'
import canvasZh from './locales/zh-CN/canvas.json'
import chatZh from './locales/zh-CN/chat.json'
import settingsZh from './locales/zh-CN/settings.json'

import commonZhTW from './locales/zh-TW/common.json'
import homeZhTW from './locales/zh-TW/home.json'
import canvasZhTW from './locales/zh-TW/canvas.json'
import chatZhTW from './locales/zh-TW/chat.json'
import settingsZhTW from './locales/zh-TW/settings.json'

const resources = {
  en: {
    common: commonEn,
    home: homeEn,
    canvas: canvasEn,
    chat: chatEn,
    settings: settingsEn,
  },
  'zh-CN': {
    common: commonZh,
    home: homeZh,
    canvas: canvasZh,
    chat: chatZh,
    settings: settingsZh,
  },
  'zh-TW': {
    common: commonZhTW,
    home: homeZhTW,
    canvas: canvasZhTW,
    chat: chatZhTW,
    settings: settingsZhTW,
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'home', 'canvas', 'chat', 'settings'],

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'language',
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: true,
    },
  })

export default i18n
