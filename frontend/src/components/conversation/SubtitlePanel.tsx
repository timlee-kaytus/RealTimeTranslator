import type { LucideIcon } from "lucide-react";

import { LanguageSelect } from "@/components/LanguageSelect";
import type { SupportedLanguage } from "@/lib/types/language";

type SubtitlePanelProps = {
  title: string;
  Icon: LucideIcon;
  accentClassName: string;
  className?: string;
  language: SupportedLanguage;
  text: string;
  fontSize: number;
  placeholder: string;
  onLanguageChange: (language: SupportedLanguage) => void;
  languageSelectId: string;
};

export function SubtitlePanel({
  title,
  Icon,
  accentClassName,
  className = "",
  language,
  text,
  fontSize,
  placeholder,
  onLanguageChange,
  languageSelectId,
}: SubtitlePanelProps) {
  const empty = text.length === 0;

  return (
    <article
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-[8px] border border-zinc-200 bg-white p-4 shadow-sm ${className}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-black text-zinc-800">
          <Icon aria-hidden className={`size-4 ${accentClassName}`} />
          {title}
        </div>
        <LanguageSelect
          id={languageSelectId}
          label="표시언어(显示语言)"
          value={language}
          onChange={onLanguageChange}
        />
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 py-5 text-center">
        <p
          lang={language}
          className={`mx-auto max-w-5xl overflow-hidden font-black leading-[1.15] text-zinc-950 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4] ${
            empty ? "text-zinc-400" : ""
          }`}
          style={{ fontSize: empty ? 20 : fontSize }}
        >
          {empty ? placeholder : text}
        </p>
      </div>
    </article>
  );
}
