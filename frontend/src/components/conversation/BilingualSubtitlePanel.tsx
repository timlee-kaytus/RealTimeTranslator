import type { LucideIcon } from "lucide-react";

import { LanguageSelect } from "@/components/LanguageSelect";
import { LANGUAGE_LABELS } from "@/lib/types/language";
import type { SupportedLanguage } from "@/lib/types/language";

type BilingualCaptionText = {
  language: SupportedLanguage;
  text: string;
  fontSize: number;
};

type BilingualSubtitlePanelProps = {
  title: string;
  Icon: LucideIcon;
  accentClassName: string;
  className?: string;
  primary: BilingualCaptionText;
  secondary: BilingualCaptionText;
  primaryPlaceholder: string;
  onPrimaryLanguageChange: (language: SupportedLanguage) => void;
  languageSelectId: string;
};

export function BilingualSubtitlePanel({
  title,
  Icon,
  accentClassName,
  className = "",
  primary,
  secondary,
  primaryPlaceholder,
  onPrimaryLanguageChange,
  languageSelectId,
}: BilingualSubtitlePanelProps) {
  const primaryText = primary.text || primaryPlaceholder;
  const primaryEmpty = primary.text.length === 0;
  const secondaryEmpty = secondary.text.length === 0;

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
          value={primary.language}
          onChange={onPrimaryLanguageChange}
        />
      </div>

      <div className="grid h-full min-h-0 flex-1 grid-rows-[minmax(0,1fr)] items-center gap-3 overflow-hidden px-2 py-5 text-center has-[section+section]:grid-rows-[minmax(0,1fr)_minmax(0,0.52fr)]">
        <section className="min-h-0 overflow-hidden self-center">
          <div className="mb-2 text-xs font-black text-zinc-500">
            {LANGUAGE_LABELS[primary.language]}
          </div>
          <p
            lang={primary.language}
            className={`mx-auto max-w-5xl overflow-hidden font-black leading-[1.15] text-zinc-950 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] ${
              primaryEmpty ? "text-zinc-400" : ""
            }`}
            style={{ fontSize: primaryEmpty ? 20 : primary.fontSize }}
          >
            {primaryText}
          </p>
        </section>

        {!secondaryEmpty && (
          <section className="min-h-0 overflow-hidden border-t border-zinc-100 pt-3">
            <div className="mb-2 text-xs font-black text-zinc-400">
              {LANGUAGE_LABELS[secondary.language]}
            </div>
            <p
              lang={secondary.language}
              className="mx-auto max-w-4xl overflow-hidden font-semibold leading-[1.2] text-zinc-700 opacity-75 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
              style={{ fontSize: secondary.fontSize }}
            >
              {secondary.text}
            </p>
          </section>
        )}
      </div>
    </article>
  );
}
