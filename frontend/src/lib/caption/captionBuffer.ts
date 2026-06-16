import {
  hasTerminalPunctuation,
  normalizeCaptionText,
  splitCaptionText,
} from "@/lib/caption/captionSegmenter";
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
    const normalizedDelta = delta.replace(/\s+/g, " ");

    if (!normalizedDelta.trim()) {
      return this.getState();
    }

    if (this.state.currentBlock.isFinal && this.state.currentBlock.text) {
      this.archiveCurrentBlock();
    }

    const nextText = normalizeCaptionText(
      `${this.state.currentBlock.text}${normalizedDelta}`,
    );

    return this.applyText(nextText, false);
  }

  replaceWithFinalText(text: string): CaptionDisplayState {
    return this.applyText(text, true);
  }

  commitCurrentBlock(): CaptionDisplayState {
    if (!this.state.currentBlock.text || this.state.currentBlock.isFinal) {
      return this.getState();
    }

    this.state = {
      ...this.state,
      currentBlock: {
        ...this.state.currentBlock,
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
    const segments = splitCaptionText({
      mode: this.mode,
      language: this.language,
      text,
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
