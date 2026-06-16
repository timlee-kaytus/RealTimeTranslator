import { UsersRound } from "lucide-react";

import { SubtitlePanel } from "@/components/conversation/SubtitlePanel";
import { DETECTED_LANGUAGE_PLACEHOLDERS } from "@/lib/types/language";
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
    <SubtitlePanel
      title="상대방 언어(对方语言)"
      Icon={UsersRound}
      accentClassName="text-emerald-700"
      className="opponent-panel"
      languageSelectId="opponent-language"
      language={language}
      text={text}
      fontSize={fontSize}
      placeholder={DETECTED_LANGUAGE_PLACEHOLDERS[language]}
      onLanguageChange={onLanguageChange}
    />
  );
}
