export type SupportedLanguage = "ko" | "en" | "zh";

export const SUPPORTED_LANGUAGES = ["ko", "en", "zh"] as const;

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  ko: "한국어",
  en: "영어",
  zh: "중국어",
};

export const OPENAI_LANGUAGE_CODES: Record<SupportedLanguage, string> = {
  ko: "ko",
  en: "en",
  zh: "zh",
};

