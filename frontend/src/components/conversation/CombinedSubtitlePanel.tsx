import {
  LANGUAGE_FLAG_LABELS,
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  DETECTED_LANGUAGE_PLACEHOLDERS,
} from "@/lib/types/language";
import type { SupportedLanguage } from "@/lib/types/language";

type CombinedSubtitlePanelProps = {
  topLanguage: SupportedLanguage;
  bottomLanguage: SupportedLanguage;
  topText: string;
  bottomText: string;
  topFontSize: number;
  bottomFontSize: number;
  onTopLanguageChange: (language: SupportedLanguage) => void;
  onBottomLanguageChange: (language: SupportedLanguage) => void;
};

export function CombinedSubtitlePanel({
  topLanguage,
  bottomLanguage,
  topText,
  bottomText,
  topFontSize,
  bottomFontSize,
  onTopLanguageChange,
  onBottomLanguageChange,
}: CombinedSubtitlePanelProps) {
  return (
    <article className="flex h-full min-h-0 flex-col overflow-hidden rounded-[8px] border border-emerald-300 bg-white p-3 shadow-sm shadow-emerald-950/5 ring-1 ring-emerald-100 md:p-4">
      <div className="flex shrink-0 justify-end">
        <div className="flex flex-wrap items-center justify-end gap-2 rounded-[8px] border border-zinc-200 bg-zinc-50 px-2 py-2">
          <span className="whitespace-nowrap text-xs font-bold text-zinc-700 md:text-sm">
            표시언어(显示语言)
          </span>
          <FlagLanguageSelect
            id="first-display-language"
            value={topLanguage}
            label="첫번째 표시언어"
            onChange={onTopLanguageChange}
          />
          <FlagLanguageSelect
            id="second-display-language"
            value={bottomLanguage}
            label="두번째 표시언어"
            onChange={onBottomLanguageChange}
          />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-2 gap-3 pt-3">
        <CaptionLine
          language={topLanguage}
          text={topText}
          fontSize={topFontSize}
        />
        <CaptionLine
          language={bottomLanguage}
          text={bottomText}
          fontSize={bottomFontSize}
        />
      </div>
    </article>
  );
}

type FlagLanguageSelectProps = {
  id: string;
  value: SupportedLanguage;
  label: string;
  onChange: (language: SupportedLanguage) => void;
};

function FlagLanguageSelect({
  id,
  value,
  label,
  onChange,
}: FlagLanguageSelectProps) {
  return (
    <select
      id={id}
      value={value}
      aria-label={`${label} ${LANGUAGE_LABELS[value]}`}
      onChange={(event) => onChange(event.target.value as SupportedLanguage)}
      className="h-10 w-16 rounded-[8px] border border-zinc-300 bg-white px-2 text-center text-xl font-semibold text-zinc-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
    >
      {SUPPORTED_LANGUAGES.map((language) => (
        <option key={language} value={language}>
          {LANGUAGE_FLAG_LABELS[language]}
        </option>
      ))}
    </select>
  );
}

type CaptionLineProps = {
  language: SupportedLanguage;
  text: string;
  fontSize: number;
};

function CaptionLine({ language, text, fontSize }: CaptionLineProps) {
  const empty = text.length === 0;

  return (
    <section
      lang={language}
      className="relative flex min-h-0 items-center justify-center overflow-hidden rounded-[8px] border border-zinc-200 bg-zinc-50/70 px-12 py-4 text-center"
    >
      <span
        aria-hidden
        className="absolute left-4 top-4 rounded-full border border-zinc-200 bg-white px-2 py-1 text-xl shadow-sm"
      >
        {LANGUAGE_FLAG_LABELS[language]}
      </span>
      <p
        className={`mx-auto max-w-5xl overflow-hidden font-black leading-[1.12] text-zinc-950 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] ${
          empty ? "text-zinc-400" : ""
        }`}
        style={{ fontSize: empty ? 20 : fontSize }}
      >
        {empty ? DETECTED_LANGUAGE_PLACEHOLDERS[language] : text}
      </p>
    </section>
  );
}
