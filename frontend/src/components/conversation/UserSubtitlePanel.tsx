import { UserRound } from "lucide-react";

import { SubtitlePanel } from "@/components/conversation/SubtitlePanel";
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
    <SubtitlePanel
      title="내 화면"
      Icon={UserRound}
      accentClassName="text-cyan-700"
      languageSelectId="user-language"
      language={language}
      text={text}
      fontSize={fontSize}
      placeholder="내 화면 자막이 여기에 표시됩니다."
      onLanguageChange={onLanguageChange}
    />
  );
}
