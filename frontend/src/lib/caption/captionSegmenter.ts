import {
  CAPTION_DISPLAY_POLICY,
  estimateCaptionLineCount,
  getCaptionWeightedLength,
} from "@/lib/caption/captionDisplayPolicy";
import type { SupportedLanguage } from "@/lib/types/language";
import type { TranslationMode } from "@/lib/types/realtime";

type SplitCaptionTextOptions = {
  mode: TranslationMode;
  language: SupportedLanguage;
  text: string;
};

const terminalPunctuation = new Set([".", "?", "!", "。", "？", "！"]);
const softBreakPunctuation = new Set([
  ",",
  ";",
  ":",
  "，",
  "、",
  "；",
  "：",
]);

export function splitCaptionText({
  mode,
  language,
  text,
}: SplitCaptionTextOptions): string[] {
  const normalizedText = normalizeCaptionText(text);

  if (!normalizedText) {
    return [];
  }

  return splitByTerminalPunctuation(normalizedText).flatMap((segment) =>
    splitByDisplayLimit({ mode, language, text: segment }),
  );
}

export function normalizeCaptionText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function hasTerminalPunctuation(text: string): boolean {
  const lastCharacter = Array.from(text.trim()).at(-1);

  return lastCharacter ? terminalPunctuation.has(lastCharacter) : false;
}

function splitByTerminalPunctuation(text: string): string[] {
  const characters = Array.from(text);
  const segments: string[] = [];
  let segmentStart = 0;

  characters.forEach((character, index) => {
    if (!terminalPunctuation.has(character)) {
      return;
    }

    const segment = characters.slice(segmentStart, index + 1).join("").trim();

    if (segment) {
      segments.push(segment);
    }

    segmentStart = index + 1;
  });

  const remainder = characters.slice(segmentStart).join("").trim();

  if (remainder) {
    segments.push(remainder);
  }

  return segments;
}

function splitByDisplayLimit({
  mode,
  language,
  text,
}: SplitCaptionTextOptions): string[] {
  const policy = CAPTION_DISPLAY_POLICY[mode];
  const chunks: string[] = [];
  let remainingText = text.trim();

  while (remainingText && exceedsDisplayLimit(mode, language, remainingText)) {
    const splitIndex = findSplitIndex(
      remainingText,
      policy.softCharLimit[language],
      language,
    );
    const nextChunk = remainingText.slice(0, splitIndex).trim();

    if (!nextChunk) {
      break;
    }

    chunks.push(nextChunk);
    remainingText = remainingText.slice(splitIndex).trim();
  }

  if (remainingText) {
    chunks.push(remainingText);
  }

  return chunks;
}

function exceedsDisplayLimit(
  mode: TranslationMode,
  language: SupportedLanguage,
  text: string,
): boolean {
  const policy = CAPTION_DISPLAY_POLICY[mode];

  return (
    getCaptionWeightedLength(text, language) > policy.softCharLimit[language] ||
    estimateCaptionLineCount(mode, language, text) > policy.maxLines
  );
}

function findSplitIndex(
  text: string,
  softCharLimit: number,
  language: SupportedLanguage,
): number {
  const characters = Array.from(text);
  const hardLimit = Math.min(characters.length, Math.max(1, softCharLimit));
  const minimumUsefulSplit = Math.max(1, Math.floor(hardLimit * 0.45));

  for (let index = hardLimit - 1; index >= minimumUsefulSplit; index -= 1) {
    const character = characters[index];

    if (
      character &&
      (terminalPunctuation.has(character) || softBreakPunctuation.has(character))
    ) {
      return index + 1;
    }
  }

  if (language === "en") {
    for (let index = hardLimit - 1; index >= minimumUsefulSplit; index -= 1) {
      if (characters[index] === " ") {
        return index + 1;
      }
    }
  }

  return hardLimit;
}
