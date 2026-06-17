import { LANGUAGE_LABELS } from "@/lib/types/language";
import type { SupportedLanguage } from "@/lib/types/language";

type CaptionPreviewProps = {
  language: SupportedLanguage;
  text: string;
  fontSize: number;
};

export function CaptionPreview({
  language,
  text,
  fontSize,
}: CaptionPreviewProps) {
  const empty = text.length === 0;

  return (
    <div className="rtt-card flex min-h-44 flex-col p-4 text-[#101114] md:min-h-52">
      <div className="flex items-center justify-between gap-3 text-sm font-bold text-[#686b82]">
        <span>미리보기</span>
        <span>{LANGUAGE_LABELS[language]}</span>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden py-4">
        <p
          lang={language}
          className={`subtitle-text max-w-6xl overflow-hidden text-center font-black leading-[1.15] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] ${
            empty ? "text-[#9497a9]" : "text-[#101114]"
          }`}
          style={{ fontSize }}
        >
          {empty ? "자막 대기 중" : text}
        </p>
      </div>
    </div>
  );
}
