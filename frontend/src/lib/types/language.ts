export type SupportedLanguage = "ko" | "en" | "zh";

export const SUPPORTED_LANGUAGES = ["ko", "en", "zh"] as const;

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  ko: "한국어",
  en: "영어",
  zh: "중국어",
};

export const LANGUAGE_SELECT_LABELS: Record<SupportedLanguage, string> = {
  ko: "한국어(韩语)",
  en: "영어(英语)",
  zh: "중국어(中文)",
};

export const LANGUAGE_FLAG_LABELS: Record<SupportedLanguage, string> = {
  ko: "🇰🇷",
  en: "🇺🇸",
  zh: "🇨🇳",
};

export const OPENAI_LANGUAGE_CODES: Record<SupportedLanguage, string> = {
  ko: "ko",
  en: "en",
  zh: "zh",
};
