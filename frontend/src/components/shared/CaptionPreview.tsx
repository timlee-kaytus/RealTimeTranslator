import { formatCaptionParagraphSpacing } from "@/lib/caption/captionSegmenter";
import { LANGUAGE_LABELS } from "@/lib/types/language";
import type { SupportedLanguage } from "@/lib/types/language";

type CaptionPreviewProps = {
  language: SupportedLanguage;
  text: string;
  fontSize: number;
  secondaryLanguage?: SupportedLanguage | null;
  secondaryText?: string;
  secondaryFontSize?: number;
};

export function CaptionPreview({
  language,
  text,
  fontSize,
  secondaryLanguage = null,
  secondaryText = "",
  secondaryFontSize,
}: CaptionPreviewProps) {
  const languageLabel =
    secondaryLanguage === null
      ? LANGUAGE_LABELS[language]
      : `${LANGUAGE_LABELS[language]} / ${LANGUAGE_LABELS[secondaryLanguage]}`;

  return (
    <div className="rtt-card flex min-h-44 flex-col p-4 text-[#101114] md:min-h-52">
      <div className="flex items-center justify-between gap-3 text-sm font-bold text-[#686b82]">
        <span>미리보기</span>
        <span>{languageLabel}</span>
      </div>
      <div
        className={`grid min-h-0 flex-1 items-center gap-3 overflow-hidden py-4 ${
          secondaryLanguage === null ? "grid-rows-1" : "grid-rows-2"
        }`}
      >
        <CaptionPreviewLine
          fontSize={fontSize}
          language={language}
          text={text}
        />
        {secondaryLanguage !== null && (
          <CaptionPreviewLine
            fontSize={secondaryFontSize ?? fontSize}
            language={secondaryLanguage}
            text={secondaryText}
          />
        )}
      </div>
    </div>
  );
}

type CaptionPreviewLineProps = {
  language: SupportedLanguage;
  text: string;
  fontSize: number;
};

function CaptionPreviewLine({
  language,
  text,
  fontSize,
}: CaptionPreviewLineProps) {
  const empty = text.length === 0;
  const displayText = empty ? "" : formatCaptionParagraphSpacing(text, language);

  return (
    <div className="flex min-h-0 items-center justify-center overflow-hidden">
      <p
        lang={language}
        className={`subtitle-text max-w-6xl overflow-hidden text-center font-black leading-[1.15] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] ${
          empty ? "text-[#9497a9]" : "text-[#101114]"
        }`}
        style={{ fontSize: empty ? Math.min(24, fontSize) : fontSize }}
      >
        {empty ? "자막 대기 중" : displayText}
      </p>
    </div>
  );
}
