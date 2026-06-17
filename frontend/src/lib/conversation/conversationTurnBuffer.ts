import type { SupportedLanguage } from "@/lib/types/language";
import type { ConversationTurn } from "@/lib/types/realtime";

type ConversationTurnUpdate = {
  sessionId: string;
  language: SupportedLanguage;
  text: string;
  detectedSourceLanguage?: SupportedLanguage | "unknown";
};

export class ConversationTurnBuffer {
  private currentTurn: ConversationTurn | null = null;
  private turnIndex = 0;

  startOrUpdateTurn({
    sessionId,
    language,
    text,
    detectedSourceLanguage,
  }: ConversationTurnUpdate): ConversationTurn {
    const nextTurn = this.shouldStartNewTurn(sessionId)
      ? this.createTurn(sessionId, detectedSourceLanguage)
      : this.currentTurn;

    if (!nextTurn) {
      throw new Error("Conversation turn could not be created.");
    }

    this.currentTurn = {
      ...nextTurn,
      detectedSourceLanguage:
        detectedSourceLanguage ?? nextTurn.detectedSourceLanguage,
      texts: {
        ...nextTurn.texts,
        [language]: text,
      },
      updatedAt: new Date().toISOString(),
      isFinal: false,
    };

    return this.copyTurn(this.currentTurn);
  }

  commitCurrentTurn(): ConversationTurn | null {
    if (!this.currentTurn) {
      return null;
    }

    this.currentTurn = {
      ...this.currentTurn,
      updatedAt: new Date().toISOString(),
      isFinal: true,
    };

    return this.copyTurn(this.currentTurn);
  }

  getCurrentTurn(): ConversationTurn | null {
    return this.currentTurn ? this.copyTurn(this.currentTurn) : null;
  }

  clear(): void {
    this.currentTurn = null;
  }

  private shouldStartNewTurn(sessionId: string): boolean {
    return (
      !this.currentTurn ||
      this.currentTurn.isFinal ||
      this.currentTurn.sessionId !== sessionId
    );
  }

  private createTurn(
    sessionId: string,
    detectedSourceLanguage?: SupportedLanguage | "unknown",
  ): ConversationTurn {
    this.turnIndex += 1;

    return {
      id: `${sessionId}-turn-${this.turnIndex}`,
      sessionId,
      detectedSourceLanguage,
      texts: {},
      updatedAt: new Date().toISOString(),
      isFinal: false,
    };
  }

  private copyTurn(turn: ConversationTurn): ConversationTurn {
    return {
      ...turn,
      texts: { ...turn.texts },
    };
  }
}
