import type { SupportedLanguage } from "@/lib/types/language";

export function normalizeCaptionText(
  text: string,
  language?: SupportedLanguage,
): string {
  void language;

  if (!text) {
    return "";
  }

  return text
    .replace(/[\t\f\v]+/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/\s+([,.!?;:%])/g, "$1")
    .replace(/\s+([，。！？；：])/g, "$1")
    .replace(/([!?])(?=[A-Za-z0-9가-힣\u3400-\u9fff])/g, "$1 ")
    .replace(/(^|[^A-Za-z0-9])\.([A-Z가-힣\u3400-\u9fff])/g, "$1. $2")
    .replace(/([。！？])(?=[A-Za-z0-9가-힣\u3400-\u9fff])/g, "$1 ")
    .replace(/([,;:])(?=[A-Za-z가-힣])/g, "$1 ")
    .replace(/([，；：])(?=[A-Za-z가-힣])/g, "$1 ")
    .replace(/ *\n */g, "\n")
    .trim();
}
