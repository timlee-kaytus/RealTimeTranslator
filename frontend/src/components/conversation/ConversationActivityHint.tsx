"use client";

import type { ConversationActivityStatus } from "@/lib/types/realtime";

type ConversationActivityHintProps = {
  status: ConversationActivityStatus;
  micLevel?: number;
};

const activityMessages: Record<ConversationActivityStatus, string> = {
  idle: "대기 중",
  connecting: "연결 중입니다.",
  warming_up: "통역 준비 중입니다. 잠시 후 말해 주세요.",
  ready: "준비 완료. 이제 말해도 됩니다.",
  listening: "듣는 중입니다.",
  speech_detected: "말이 감지되었습니다.",
  translating: "번역 중입니다.",
  reconnecting: "재연결 중입니다.",
  error: "오류가 발생했습니다.",
  stopped: "중지됨",
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
  return (
    <div
      aria-live="polite"
      className={`inline-flex min-h-8 w-fit max-w-full items-center justify-center rounded-[8px] border px-3 py-1 text-center text-xs font-bold ${activityClasses[status]}`}
    >
      {activityMessages[status]}
    </div>
  );
}
