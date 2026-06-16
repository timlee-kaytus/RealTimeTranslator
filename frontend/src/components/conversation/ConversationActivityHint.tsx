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
  idle: "border-zinc-200 bg-white text-zinc-700",
  connecting: "border-amber-200 bg-amber-50 text-amber-800",
  warming_up: "border-amber-200 bg-amber-50 text-amber-900",
  ready: "border-emerald-200 bg-emerald-50 text-emerald-900",
  listening: "border-emerald-200 bg-emerald-50 text-emerald-800",
  speech_detected: "border-lime-200 bg-lime-50 text-lime-900",
  translating: "border-cyan-200 bg-cyan-50 text-cyan-900",
  reconnecting: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-red-200 bg-red-50 text-red-800",
  stopped: "border-red-700 bg-red-600 text-white",
};

export function ConversationActivityHint({
  status,
}: ConversationActivityHintProps) {
  return (
    <div
      aria-live="polite"
      className={`flex h-10 min-w-56 items-center justify-center rounded-[8px] border px-3 text-center text-xs font-bold ${activityClasses[status]}`}
    >
      {activityMessages[status]}
    </div>
  );
}
