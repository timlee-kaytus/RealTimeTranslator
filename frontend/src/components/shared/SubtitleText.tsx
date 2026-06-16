import type { SupportedLanguage } from "@/lib/types/language";

type SubtitleTextProps = {
  text: string;
  language: SupportedLanguage;
  fontSize: number;
};

export function SubtitleText({ text, language, fontSize }: SubtitleTextProps) {
  return (
    <p
      lang={language}
      className="subtitle-text max-w-4xl text-center font-black leading-tight text-zinc-950"
      style={{ fontSize }}
    >
      {text || "자막 대기 중"}
    </p>
  );
}
