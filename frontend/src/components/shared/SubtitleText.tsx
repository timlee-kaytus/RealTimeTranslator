import type { SupportedLanguage } from "@/lib/types/language";

type SubtitleTextProps = {
  text: string;
  language: SupportedLanguage;
};

export function SubtitleText({ text, language }: SubtitleTextProps) {
  return (
    <p
      lang={language}
      className="subtitle-text max-w-4xl text-center text-[2.35rem] font-black leading-tight text-zinc-950"
    >
      {text || "자막 대기 중"}
    </p>
  );
}

