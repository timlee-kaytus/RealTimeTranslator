import {
  LANGUAGE_FLAG_LABELS,
  LANGUAGE_LABELS,
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
    <label className="flex items-center gap-2 text-sm font-semibold text-[#686b82]">
      <span className="whitespace-nowrap">{label}</span>
      <select
        id={id}
        value={value}
        aria-label={`${label} ${LANGUAGE_LABELS[value]}`}
        onChange={(event) => onChange(event.target.value as SupportedLanguage)}
        className="rtt-select h-10 w-16 px-2 text-center text-xl font-semibold"
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <option
            key={language}
            value={language}
            aria-label={LANGUAGE_SELECT_LABELS[language]}
          >
            {LANGUAGE_FLAG_LABELS[language]}
          </option>
        ))}
      </select>
    </label>
  );
}
