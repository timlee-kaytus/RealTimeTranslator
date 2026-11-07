"use client";

import { Languages } from "lucide-react";

import {
  UI_LANGUAGE_NATIVE_LABELS,
  useUiLanguage,
  type UiLanguage,
} from "@/lib/i18n/uiLanguage";
import { SUPPORTED_LANGUAGES } from "@/lib/types/language";

type UiLanguageSelectProps = {
  compact?: boolean;
};

export function UiLanguageSelect({ compact = false }: UiLanguageSelectProps) {
  const { language, setLanguage, t } = useUiLanguage();

  return (
    <label
      className={`inline-flex min-h-11 items-center gap-2 rounded-[12px] border border-[#dedee5] bg-white text-sm font-bold text-[#4f5368] shadow-[rgba(16,24,40,0.04)_0px_1px_4px] ${
        compact ? "px-3" : "px-4"
      }`}
    >
      <Languages aria-hidden className="size-4 shrink-0 text-[#7132f5]" />
      {!compact && <span className="whitespace-nowrap">{t("language")}</span>}
      <select
        value={language}
        aria-label={t("language")}
        onChange={(event) =>
          setLanguage(event.target.value as UiLanguage)
        }
        className="min-w-0 border-0 bg-transparent font-bold text-[#303242] outline-none"
      >
        {SUPPORTED_LANGUAGES.map((option) => (
          <option key={option} value={option}>
            {UI_LANGUAGE_NATIVE_LABELS[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
