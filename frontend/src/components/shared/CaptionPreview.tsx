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
  return (
    <div className="flex min-h-44 flex-col rounded-[8px] border border-zinc-200 bg-zinc-950 p-4 text-white shadow-sm md:min-h-52">
      <div className="flex items-center justify-between gap-3 text-sm font-bold text-zinc-300">
        <span>미리보기</span>
        <span>{LANGUAGE_LABELS[language]}</span>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden py-4">
        <p
          lang={language}
          className="subtitle-text max-w-6xl overflow-hidden text-center font-black leading-tight [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
          style={{ fontSize }}
        >
          {text || "자막 대기 중"}
        </p>
      </div>
    </div>
  );
}
