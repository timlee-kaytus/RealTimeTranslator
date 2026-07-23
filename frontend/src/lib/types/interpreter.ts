export type InterpreterLanguage = "ko" | "zh";

export type InterpreterStatus =
  | "idle"
  | "requesting_microphone"
  | "connecting"
  | "listening"
  | "user_speaking"
  | "interpreting"
  | "assistant_speaking"
  | "muted"
  | "reconnecting"
  | "error"
  | "stopped";

export type CreateInterpreterSessionRequest = {
  clientId: string;
  uiSessionId: string;
  languages: [InterpreterLanguage, InterpreterLanguage];
  microphoneProfile?: "near_field" | "far_field";
};

export type CreateInterpreterSessionResponse = {
  sessionId: string;
  provider: "openai" | "mock";
  transport: "webrtc" | "mock";
  clientSecret: string;
  expiresAt: string;
  model: string;
  voice: string;
};

export type InterpreterTranscriptEvent = {
  itemId?: string;
  responseId?: string;
  text: string;
};

export type InterpreterVoiceEvent =
  | "connected"
  | "disconnected"
  | "speech_started"
  | "speech_stopped"
  | "response_started"
  | "response_audio_started"
  | "response_audio_done"
  | "response_done"
  | "session_closed";
