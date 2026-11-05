export type SupportedLanguage = "ko" | "en" | "zh" | "ja";

export const SUPPORTED_LANGUAGES = ["ko", "en", "zh", "ja"] as const;

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  ko: "한국어",
  en: "영어",
  zh: "중국어",
  ja: "일본어",
};

export const LANGUAGE_SELECT_LABELS: Record<SupportedLanguage, string> = {
  ko: "한국어(韩语)",
  en: "영어(英语)",
  zh: "중국어(中文)",
  ja: "일본어(JP)",
};

export const LANGUAGE_FLAG_LABELS: Record<SupportedLanguage, string> = {
  ko: "KR",
  en: "EN",
  zh: "ZH",
  ja: "JP",
};

export const DETECTED_LANGUAGE_PLACEHOLDERS: Record<
  SupportedLanguage,
  string
> = {
  ko: "감지된 언어가 이곳에 표기됩니다.",
  en: "The detected language will be displayed here.",
  zh: "检测到的语言将在此显示。",
  ja: "検出された言語がここに表示されます。",
};

export const OPENAI_LANGUAGE_CODES: Record<SupportedLanguage, string> = {
  ko: "ko",
  en: "en",
  zh: "zh",
  ja: "ja",
};
