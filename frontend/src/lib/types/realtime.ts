import type { SupportedLanguage } from "./language";

export type RealtimeConnectionStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "translating"
  | "reconnecting"
  | "error"
  | "stopped";

export type TranslationMode = "conversation" | "presentation";

export type CaptionEventType =
  | "caption_delta"
  | "caption_final"
  | "status"
  | "error";

export type ConversationCaptionEvent = {
  type: CaptionEventType;
  mode: "conversation";
  sessionId: string;
  detectedLanguage?: SupportedLanguage | "unknown";
  top: {
    language: SupportedLanguage;
    text: string;
  };
  bottom: {
    language: SupportedLanguage;
    text: string;
  };
  isFinal: boolean;
  timestamp: string;
};

export type PresentationCaptionEvent = {
  type: CaptionEventType;
  mode: "presentation";
  sessionId: string;
  detectedLanguage?: SupportedLanguage | "unknown";
  output: {
    language: SupportedLanguage;
    text: string;
  };
  isFinal: boolean;
  timestamp: string;
};

export type CreateRealtimeSessionRequest = {
  mode: TranslationMode;
  targetLanguages: SupportedLanguage[];
  clientId: string;
  uiSessionId: string;
};

export type RealtimeSessionCredential = {
  sessionId: string;
  targetLanguage: SupportedLanguage;
  provider: "openai" | "mock";
  transport: "webrtc" | "mock";
  clientSecret: string;
  expiresAt: string;
  model: string;
};

export type CreateRealtimeSessionResponse = RealtimeSessionCredential & {
  sessions: RealtimeSessionCredential[];
};

export type EndRealtimeSessionRequest = {
  sessionId: string;
  reason: "user_stop" | "window_closed" | "error" | "session_expired";
};

export type UsageEventRequest = {
  sessionId: string;
  eventType: "session_started" | "session_stopped" | "caption_event";
  mode: TranslationMode;
  timestamp: string;
};
