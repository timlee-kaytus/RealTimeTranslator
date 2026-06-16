import { UsersRound } from "lucide-react";

import { BilingualSubtitlePanel } from "@/components/conversation/BilingualSubtitlePanel";
import type { SupportedLanguage } from "@/lib/types/language";

type OpponentSubtitlePanelProps = {
  primaryLanguage: SupportedLanguage;
  primaryText: string;
  primaryFontSize: number;
  secondaryLanguage: SupportedLanguage;
  secondaryText: string;
  secondaryFontSize: number;
  onLanguageChange: (language: SupportedLanguage) => void;
};

export function OpponentSubtitlePanel({
  primaryLanguage,
  primaryText,
  primaryFontSize,
  secondaryLanguage,
  secondaryText,
  secondaryFontSize,
  onLanguageChange,
}: OpponentSubtitlePanelProps) {
  return (
    <BilingualSubtitlePanel
      title="상대방 화면"
      Icon={UsersRound}
      accentClassName="text-emerald-700"
      languageSelectId="opponent-language"
      primary={{
        language: primaryLanguage,
        text: primaryText,
        fontSize: primaryFontSize,
      }}
      secondary={{
        language: secondaryLanguage,
        text: secondaryText,
        fontSize: secondaryFontSize,
      }}
      primaryPlaceholder="상대방 언어 자막이 여기에 표시됩니다."
      onPrimaryLanguageChange={onLanguageChange}
    />
  );
}
