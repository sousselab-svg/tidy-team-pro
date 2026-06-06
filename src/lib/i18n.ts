import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { en } from "./locales/en";
import { es } from "./locales/es";
import { pt } from "./locales/pt";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English (US)", flag: "🇺🇸" },
  { code: "es", label: "Español (US)", flag: "🇺🇸" },
  { code: "pt", label: "Português (BR)", flag: "🇧🇷" },
] as const;

export type LangCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        es: { translation: es },
        pt: { translation: pt },
      },
      fallbackLng: "en",
      supportedLngs: ["en", "es", "pt"],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage"],
        lookupLocalStorage: "lang",
        caches: ["localStorage"],
      },
      // Default: English (US)
      lng: typeof window !== "undefined"
        ? (localStorage.getItem("lang") as LangCode | null) ?? "en"
        : "en",
    });
}

export default i18n;