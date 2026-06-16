import { UserRound } from "lucide-react";

import { BilingualSubtitlePanel } from "@/components/conversation/BilingualSubtitlePanel";
import type { SupportedLanguage } from "@/lib/types/language";

type UserSubtitlePanelProps = {
  primaryLanguage: SupportedLanguage;
  primaryText: string;
  primaryFontSize: number;
  secondaryLanguage: SupportedLanguage;
  secondaryText: string;
  secondaryFontSize: number;
  onLanguageChange: (language: SupportedLanguage) => void;
};

export function UserSubtitlePanel({
  primaryLanguage,
  primaryText,
  primaryFontSize,
  secondaryLanguage,
  secondaryText,
  secondaryFontSize,
  onLanguageChange,
}: UserSubtitlePanelProps) {
  return (
    <BilingualSubtitlePanel
      title="내 화면"
      Icon={UserRound}
      accentClassName="text-cyan-700"
      languageSelectId="user-language"
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
      primaryPlaceholder="내 언어 자막이 여기에 표시됩니다."
      onPrimaryLanguageChange={onLanguageChange}
    />
  );
}
