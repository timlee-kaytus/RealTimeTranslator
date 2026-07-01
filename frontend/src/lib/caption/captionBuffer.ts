import {
  hasTerminalPunctuation,
  splitCaptionText,
} from "@/lib/caption/captionSegmenter";
import { normalizeCaptionText } from "@/lib/caption/normalizeCaptionText";
import type { SupportedLanguage } from "@/lib/types/language";
import type { TranslationMode } from "@/lib/types/realtime";

export type CaptionBlock = {
  id: string;
  text: string;
  language: SupportedLanguage;
  isFinal: boolean;
  createdAt: string;
};

export type CaptionDisplayState = {
  currentBlock: CaptionBlock;
  recentBlocks: CaptionBlock[];
};

type CaptionBufferOptions = {
  mode: TranslationMode;
  language: SupportedLanguage;
  recentBlockLimit?: number;
};

export class CaptionBuffer {
  private readonly mode: TranslationMode;
  private readonly recentBlockLimit: number;
  private language: SupportedLanguage;
  private state: CaptionDisplayState;
  private blockIndex = 0;

  constructor({ mode, language, recentBlockLimit = 8 }: CaptionBufferOptions) {
    this.mode = mode;
    this.language = language;
    this.recentBlockLimit = recentBlockLimit;
    this.state = {
      currentBlock: this.createBlock("", false),
      recentBlocks: [],
    };
  }

  setLanguage(language: SupportedLanguage): CaptionDisplayState {
    this.language = language;
    return this.clear();
  }

  appendDelta(delta: string): CaptionDisplayState {
    const normalizedDelta = normalizeRealtimeDelta(delta);

    if (!normalizedDelta.trim()) {
      return this.getState();
    }

    if (this.state.currentBlock.isFinal && this.state.currentBlock.text) {
      this.archiveCurrentBlock();
    }

    const nextText = appendRealtimeDelta(
      this.state.currentBlock.text,
      normalizedDelta,
      this.language,
    );

    return this.applyText(nextText, false);
  }

  replaceWithFinalText(text: string): CaptionDisplayState {
    return this.applyText(text, true);
  }

  replaceCurrentText(text: string): CaptionDisplayState {
    return this.applyText(text, false);
  }

  commitCurrentBlock(): CaptionDisplayState {
    if (!this.state.currentBlock.text || this.state.currentBlock.isFinal) {
      return this.getState();
    }

    this.state = {
      ...this.state,
      currentBlock: {
        ...this.state.currentBlock,
        text: normalizeCaptionText(
          this.state.currentBlock.text,
          this.language,
        ),
        isFinal: true,
      },
    };

    return this.getState();
  }

  clear(): CaptionDisplayState {
    this.state = {
      currentBlock: this.createBlock("", false),
      recentBlocks: [],
    };

    return this.getState();
  }

  getState(): CaptionDisplayState {
    return {
      currentBlock: { ...this.state.currentBlock },
      recentBlocks: this.state.recentBlocks.map((block) => ({ ...block })),
    };
  }

  private applyText(text: string, finalLastBlock: boolean): CaptionDisplayState {
    const captionText = finalLastBlock
      ? normalizeCaptionText(text, this.language)
      : text;
    const segments = splitCaptionText({
      mode: this.mode,
      language: this.language,
      text: captionText,
    });

    if (segments.length === 0) {
      return this.clear();
    }

    const recentBlocks = [...this.state.recentBlocks];
    const previousSegments = segments.slice(0, -1);

    previousSegments.forEach((segment) => {
      recentBlocks.push(this.createBlock(segment, true));
    });

    this.state = {
      currentBlock: this.createBlock(
        segments[segments.length - 1] ?? "",
        finalLastBlock || hasTerminalPunctuation(segments[segments.length - 1] ?? ""),
      ),
      recentBlocks: recentBlocks.slice(-this.recentBlockLimit),
    };

    return this.getState();
  }

  private archiveCurrentBlock() {
    this.state = {
      currentBlock: this.createBlock("", false),
      recentBlocks: [
        ...this.state.recentBlocks,
        {
          ...this.state.currentBlock,
          isFinal: true,
        },
      ].slice(-this.recentBlockLimit),
    };
  }

  private createBlock(text: string, isFinal: boolean): CaptionBlock {
    this.blockIndex += 1;

    return {
      id: `${this.mode}-${this.language}-${this.blockIndex}`,
      text,
      language: this.language,
      isFinal,
      createdAt: new Date().toISOString(),
    };
  }
}

function appendRealtimeDelta(
  currentText: string,
  delta: string,
  language: SupportedLanguage,
): string {
  const normalizedDelta = normalizeRealtimeDelta(delta);

  if (!currentText) {
    return normalizedDelta.trimStart();
  }

  const separator = getRealtimeDeltaSeparator(
    currentText,
    normalizedDelta,
    language,
  );

  return normalizeRealtimeDelta(`${currentText}${separator}${normalizedDelta}`);
}

function normalizeRealtimeDelta(text: string): string {
  return text.replace(/\s+/g, " ");
}

function getRealtimeDeltaSeparator(
  currentText: string,
  delta: string,
  language: SupportedLanguage,
): string {
  const currentTail = currentText.trimEnd();

  if (
    !currentTail ||
    !delta ||
    /\s$/u.test(currentText) ||
    /^\s/u.test(delta) ||
    startsWithPunctuation(delta)
  ) {
    return "";
  }

  const lastCharacter = Array.from(currentTail).at(-1) ?? "";
  const firstCharacter = Array.from(delta.trimStart()).at(0) ?? "";

  if (language === "en") {
    return isAsciiWordLike(lastCharacter) && isAsciiWordLike(firstCharacter)
      ? " "
      : "";
  }

  if (language !== "ko") {
    return "";
  }

  if (
    (isHangul(lastCharacter) && isAsciiWordLike(firstCharacter)) ||
    (isAsciiWordLike(lastCharacter) &&
      isHangul(firstCharacter) &&
      !startsWithKoreanParticle(delta))
  ) {
    return " ";
  }

  if (
    isHangul(firstCharacter) &&
    endsWithKoreanSpacingBoundary(currentTail)
  ) {
    return " ";
  }

  return "";
}

function startsWithPunctuation(text: string): boolean {
  return /^[,.!?;:%，。！？；：、)\]}>"”’]/u.test(text.trimStart());
}

function isAsciiWordLike(character: string): boolean {
  return /[A-Za-z0-9]/u.test(character);
}

function isHangul(character: string): boolean {
  return /[가-힣]/u.test(character);
}

function startsWithKoreanParticle(text: string): boolean {
  return /^(?:은|는|이|가|을|를|에게|에서|부터|까지|으로|로|와|과|도|만|에|의)(?:\s|[,.!?;:%，。！？；：]|$)/u.test(
    text.trimStart(),
  );
}

function endsWithKoreanSpacingBoundary(text: string): boolean {
  return /(?:합니다|했습니다|됩니다|되었습니다|있습니다|없습니다|겠습니다|입니다|드립니다|주세요|봅니다|은|는|이|가|을|를|에게|에서|부터|까지|으로|로|와|과|도|만|에|의)$/u.test(
    text,
  );
}
