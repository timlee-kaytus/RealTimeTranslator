import type { SupportedLanguage } from "@/lib/types/language";

export type DetectedSupportedLanguage = SupportedLanguage | "unknown";

export function detectSupportedLanguage(
  text: string,
): DetectedSupportedLanguage {
  if (!text.trim()) {
    return "unknown";
  }

  const hangulCount = countMatches(text, /[가-힣ㄱ-ㅎㅏ-ㅣ]/gu);
  const hanCount = countMatches(text, /[\u3400-\u9fff]/gu);
  const latinCount = countMatches(text, /[A-Za-z]/gu);

  if (hangulCount > 0) {
    return "ko";
  }

  if (hanCount > 0) {
    return "zh";
  }

  if (latinCount > 0) {
    return "en";
  }

  return "unknown";
}

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}
