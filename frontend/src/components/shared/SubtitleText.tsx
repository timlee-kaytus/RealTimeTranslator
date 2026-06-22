import { formatCaptionParagraphSpacing } from "@/lib/caption/captionSegmenter";
import type { SupportedLanguage } from "@/lib/types/language";

type SubtitleTextProps = {
  text: string;
  language: SupportedLanguage;
  fontSize: number;
};

export function SubtitleText({ text, language, fontSize }: SubtitleTextProps) {
  const displayText = text ? formatCaptionParagraphSpacing(text, language) : "";

  return (
    <p
      lang={language}
      className="subtitle-text max-w-4xl text-center font-black leading-tight text-zinc-950"
      style={{ fontSize }}
    >
      {displayText || "자막 대기 중"}
    </p>
  );
}
