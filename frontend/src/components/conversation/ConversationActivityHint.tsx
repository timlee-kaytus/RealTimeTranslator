"use client";

import type { ConversationActivityStatus } from "@/lib/types/realtime";
import { useUiLanguage, type UiMessageKey } from "@/lib/i18n/uiLanguage";

type ConversationActivityHintProps = {
  status: ConversationActivityStatus;
  micLevel?: number;
};

const activityMessageKeys: Record<ConversationActivityStatus, UiMessageKey> = {
  idle: "activityIdle",
  connecting: "activityConnecting",
  warming_up: "activityWarmingUp",
  ready: "activityReady",
  listening: "activityListening",
  speech_detected: "activitySpeechDetected",
  translating: "activityTranslating",
  reconnecting: "activityReconnecting",
  error: "activityError",
  stopped: "activityStopped",
};

const activityClasses: Record<ConversationActivityStatus, string> = {
  idle: "border-[#dedee5] bg-[rgba(104,107,130,0.12)] text-[#484b5e]",
  connecting:
    "border-[rgba(133,91,251,0.28)] bg-[rgba(133,91,251,0.16)] text-[#7132f5]",
  warming_up:
    "border-[rgba(133,91,251,0.28)] bg-[rgba(133,91,251,0.16)] text-[#7132f5]",
  ready:
    "border-[rgba(20,158,97,0.24)] bg-[rgba(20,158,97,0.16)] text-[#026b3f]",
  listening:
    "border-[rgba(20,158,97,0.24)] bg-[rgba(20,158,97,0.16)] text-[#026b3f]",
  speech_detected:
    "border-[rgba(20,158,97,0.24)] bg-[rgba(20,158,97,0.16)] text-[#026b3f]",
  translating:
    "border-[rgba(133,91,251,0.28)] bg-[rgba(133,91,251,0.16)] text-[#7132f5]",
  reconnecting:
    "border-[rgba(133,91,251,0.28)] bg-[rgba(133,91,251,0.16)] text-[#7132f5]",
  error: "border-red-100 bg-red-50 text-red-700",
  stopped: "border-[#dedee5] bg-[rgba(104,107,130,0.12)] text-[#484b5e]",
};

export function ConversationActivityHint({
  status,
}: ConversationActivityHintProps) {
  const { t } = useUiLanguage();

  return (
    <div
      aria-live="polite"
      className={`inline-flex min-h-8 w-fit max-w-full items-center justify-center rounded-[8px] border px-3 py-1 text-center text-xs font-bold ${activityClasses[status]}`}
    >
      {t(activityMessageKeys[status])}
    </div>
  );
}
