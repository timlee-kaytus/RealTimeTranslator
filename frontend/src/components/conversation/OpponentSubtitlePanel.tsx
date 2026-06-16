import { UsersRound } from "lucide-react";

import { LanguageSelect } from "@/components/LanguageSelect";
import { SubtitleText } from "@/components/shared/SubtitleText";
import { LANGUAGE_LABELS } from "@/lib/types/language";
import type { SupportedLanguage } from "@/lib/types/language";

type OpponentSubtitlePanelProps = {
  language: SupportedLanguage;
  text: string;
  fontSize: number;
  onLanguageChange: (language: SupportedLanguage) => void;
};

export function OpponentSubtitlePanel({
  language,
  text,
  fontSize,
  onLanguageChange,
}: OpponentSubtitlePanelProps) {
  return (
    <article className="opponent-panel flex min-h-0 flex-col rounded-[8px] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-black text-zinc-800">
          <UsersRound aria-hidden className="size-4 text-emerald-700" />
          상대방 화면
        </div>
        <LanguageSelect
          id="opponent-language"
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
