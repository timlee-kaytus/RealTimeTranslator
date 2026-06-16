import {
  LANGUAGE_SELECT_LABELS,
  SUPPORTED_LANGUAGES,
} from "@/lib/types/language";
import type { SupportedLanguage } from "@/lib/types/language";

type LanguageSelectProps = {
  id: string;
  label: string;
  value: SupportedLanguage;
  onChange: (language: SupportedLanguage) => void;
};

export function LanguageSelect({
  id,
  label,
  value,
  onChange,
}: LanguageSelectProps) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
      <span className="whitespace-nowrap">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as SupportedLanguage)}
        className="h-10 rounded-[8px] border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <option key={language} value={language}>
            {LANGUAGE_SELECT_LABELS[language]}
          </option>
        ))}
      </select>
    </label>
  );
}
