import { UserRound } from "lucide-react";

import { LanguageSelect } from "@/components/LanguageSelect";
import { SubtitleText } from "@/components/shared/SubtitleText";
import { LANGUAGE_LABELS } from "@/lib/types/language";
import type { SupportedLanguage } from "@/lib/types/language";

type UserSubtitlePanelProps = {
  language: SupportedLanguage;
  text: string;
  fontSize: number;
  onLanguageChange: (language: SupportedLanguage) => void;
};

export function UserSubtitlePanel({
  language,
  text,
  fontSize,
  onLanguageChange,
}: UserSubtitlePanelProps) {
  return (
    <article className="flex min-h-0 flex-col rounded-[8px] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-black text-zinc-800">
          <UserRound aria-hidden className="size-4 text-cyan-700" />내 화면
        </div>
        <LanguageSelect
          id="user-language"
          label="표시 언어"
          value={language}
          onChange={onLanguageChange}
        />
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-2 py-6">
        <SubtitleText language={language} text={text} fontSize={fontSize} />
      </div>
      <div className="text-center text-xs font-bold text-zinc-500">
        {LANGUAGE_LABELS[language]}
      </div>
    </article>
  );
}
