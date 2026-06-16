import { UsersRound } from "lucide-react";

import { SubtitlePanel } from "@/components/conversation/SubtitlePanel";
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
      title="상대방 화면"
      Icon={UsersRound}
      accentClassName="text-emerald-700"
      className="opponent-panel"
      languageSelectId="opponent-language"
      language={language}
      text={text}
      fontSize={fontSize}
      placeholder="상대방 화면 자막이 여기에 표시됩니다."
      onLanguageChange={onLanguageChange}
    />
  );
}
