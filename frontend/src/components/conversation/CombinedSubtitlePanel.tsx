import { formatCaptionParagraphSpacing } from "@/lib/caption/captionSegmenter";
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
  languageSelectDisabled?: boolean;
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
  languageSelectDisabled = false,
  onTopLanguageChange,
  onBottomLanguageChange,
}: CombinedSubtitlePanelProps) {
  return (
    <article className="rtt-card flex h-full min-h-0 flex-col overflow-hidden p-3 md:p-4">
      <div className="flex shrink-0 justify-end">
        <div className="flex flex-wrap items-center justify-end gap-2 rounded-[12px] border border-[#dedee5] bg-[rgba(148,151,169,0.08)] px-2 py-2">
          <span className="whitespace-nowrap text-xs font-bold text-[#686b82] md:text-sm">
            표시언어(显示语言)
          </span>
          <FlagLanguageSelect
            id="first-display-language"
            value={topLanguage}
            label="첫번째 표시언어"
            disabled={languageSelectDisabled}
            onChange={onTopLanguageChange}
          />
          <FlagLanguageSelect
            id="second-display-language"
            value={bottomLanguage}
            label="두번째 표시언어"
            disabled={languageSelectDisabled}
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
  disabled?: boolean;
  onChange: (language: SupportedLanguage) => void;
};

function FlagLanguageSelect({
  id,
  value,
  label,
  disabled = false,
  onChange,
}: FlagLanguageSelectProps) {
  return (
    <select
      id={id}
      value={value}
      aria-label={`${label} ${LANGUAGE_LABELS[value]}`}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as SupportedLanguage)}
      className="rtt-select h-10 w-16 px-2 text-center text-xl font-semibold disabled:cursor-not-allowed disabled:opacity-60"
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
  const displayText = empty ? "" : formatCaptionParagraphSpacing(text);

  return (
    <section
      lang={language}
      className="relative flex min-h-0 items-center justify-center overflow-hidden rounded-[12px] border border-[#dedee5] bg-[rgba(148,151,169,0.08)] px-12 py-4 text-center"
    >
      <span
        aria-hidden
        className="absolute left-4 top-4 rounded-[8px] border border-[#dedee5] bg-white px-2 py-1 text-xl shadow-[rgba(16,24,40,0.04)_0px_1px_4px]"
      >
        {LANGUAGE_FLAG_LABELS[language]}
      </span>
      <p
        className={`mx-auto max-w-5xl overflow-hidden font-black leading-[1.12] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4] ${
          empty ? "text-[#9497a9]" : "text-[#101114]"
        }`}
        style={{ fontSize: empty ? 20 : fontSize }}
      >
        {empty ? DETECTED_LANGUAGE_PLACEHOLDERS[language] : displayText}
      </p>
    </section>
  );
}
