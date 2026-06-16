import type { SupportedLanguage } from "@/lib/types/language";
import type { TranslationMode } from "@/lib/types/realtime";

type CaptionModePolicy = {
  maxLines: number;
  softCharLimit: Record<SupportedLanguage, number>;
  maxVisibleBlocks: number;
  defaultFontSize: number;
  minFontSize: number;
};

export const CAPTION_IDLE_COMMIT_MS = 1200;
export const CAPTION_DISPLAY_POLICY: Record<TranslationMode, CaptionModePolicy> = {
  presentation: {
    maxLines: 3,
    softCharLimit: {
      ko: 80,
      zh: 80,
      en: 160,
    },
    maxVisibleBlocks: 1,
    defaultFontSize: 56,
    minFontSize: 36,
  },
  conversation: {
    maxLines: 4,
    softCharLimit: {
      ko: 90,
      zh: 90,
      en: 180,
    },
    maxVisibleBlocks: 1,
    defaultFontSize: 48,
    minFontSize: 32,
  },
};

type CaptionFontSizeOptions = {
  mode: TranslationMode;
  language: SupportedLanguage;
  text: string;
  preferredFontSize?: number;
};

export function getCaptionDisplayFontSize({
  mode,
  language,
  text,
  preferredFontSize,
}: CaptionFontSizeOptions): number {
  const policy = CAPTION_DISPLAY_POLICY[mode];
  const baseFontSize = preferredFontSize ?? policy.defaultFontSize;
  const estimatedLines = estimateCaptionLineCount(mode, language, text);
  const overflowingLines = Math.max(0, estimatedLines - policy.maxLines);
  const adjustedFontSize = baseFontSize - overflowingLines * 4;

  return Math.max(policy.minFontSize, Math.min(baseFontSize, adjustedFontSize));
}

export function estimateCaptionLineCount(
  mode: TranslationMode,
  language: SupportedLanguage,
  text: string,
): number {
  const normalizedText = text.trim();

  if (!normalizedText) {
    return 1;
  }

  const policy = CAPTION_DISPLAY_POLICY[mode];
  const lineCapacity = policy.softCharLimit[language] / policy.maxLines;
  const weightedLength = getCaptionWeightedLength(normalizedText, language);

  return Math.max(1, Math.ceil(weightedLength / lineCapacity));
}

export function getCaptionWeightedLength(
  text: string,
  language: SupportedLanguage,
): number {
  if (language !== "en") {
    return Array.from(text).length;
  }

  return Array.from(text).reduce((length, character) => {
    if (character === " ") {
      return length + 0.35;
    }

    return length + 0.65;
  }, 0);
}
