"use client";

import { AudioLines, Square } from "lucide-react";

import { VoiceOrb } from "@/components/interpreter/VoiceOrb";
import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { useRealtimeInterpreter } from "@/hooks/useRealtimeInterpreter";
import type { InterpreterStatus } from "@/lib/types/interpreter";

const statusMessages: Record<InterpreterStatus, string> = {
  idle: "실시간 통역 대기 중",
  requesting_microphone: "마이크 권한 확인 중",
  connecting: "통역 연결 중",
  listening: "듣는 중",
  user_speaking: "음성을 듣고 있습니다",
  interpreting: "통역 중",
  assistant_speaking: "통역 음성 출력 중",
  muted: "마이크 음소거됨",
  reconnecting: "통역 세션 재연결 중",
  error: "연결 오류",
  stopped: "통역이 중지되었습니다",
};

const statusDotClasses: Record<InterpreterStatus, string> = {
  idle: "bg-[#9497a9]",
  requesting_microphone: "bg-[#7132f5]",
  connecting: "bg-[#7132f5]",
  listening: "bg-[#149e61]",
  user_speaking: "bg-[#22a6a1]",
  interpreting: "bg-[#7132f5]",
  assistant_speaking: "bg-[#22a6a1]",
  muted: "bg-[#686b82]",
  reconnecting: "bg-[#7132f5]",
  error: "bg-red-600",
  stopped: "bg-[#9497a9]",
};

export function InterpreterMode() {
  const {
    status,
    active,
    busy,
    muted,
    inputLevel,
    outputLevel,
    errorMessage,
    start,
    stop,
    toggleMute,
  } = useRealtimeInterpreter();

  async function handleSessionToggle() {
    if (active) {
      await stop();
      return;
    }

    await start();
  }

  return (
    <section className="flex min-h-[calc(100dvh-76px)] flex-col items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-3xl flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-3 text-sm font-black text-[#4f5368] sm:text-base">
          <span className="rounded-[8px] border border-[#dedee5] bg-white px-3 py-1.5 shadow-[rgba(16,24,40,0.04)_0px_1px_4px]">
            한국어
          </span>
          <AudioLines aria-hidden className="size-5 text-[#7132f5]" />
          <span className="rounded-[8px] border border-[#dedee5] bg-white px-3 py-1.5 shadow-[rgba(16,24,40,0.04)_0px_1px_4px]">
            中文
          </span>
        </div>

        <VoiceOrb
          status={status}
          inputLevel={inputLevel}
          outputLevel={outputLevel}
          active={active}
          busy={busy}
          muted={muted}
          onToggleMute={toggleMute}
        />

        <div
          aria-live="polite"
          className="flex min-h-9 items-center justify-center gap-2 text-base font-black text-[#303242]"
        >
          <span
            aria-hidden
            className={`size-2.5 rounded-full ${statusDotClasses[status]} ${
              isAnimatedStatus(status) ? "interpreter-status-dot" : ""
            }`}
          />
          {statusMessages[status]}
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={handleSessionToggle}
          className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] border px-5 text-sm font-black transition disabled:cursor-wait disabled:border-transparent disabled:bg-[#c4c6d1] disabled:text-white sm:text-base ${
            active
              ? "border-[#dedee5] bg-white text-[#303242] shadow-[rgba(16,24,40,0.04)_0px_1px_4px] hover:border-[#c9b8ff] hover:bg-[#f4f2ff]"
              : "border-transparent bg-[#7132f5] text-white shadow-[rgba(0,0,0,0.03)_0px_4px_24px] hover:bg-[#5741d8]"
          }`}
        >
          {active ? (
            <Square aria-hidden className="size-4" fill="currentColor" />
          ) : (
            <AudioLines aria-hidden className="size-5" />
          )}
          {busy
            ? "통역 연결 중..."
            : active
              ? "실시간 통역 종료"
              : "실시간 통역 시작"}
        </button>

        <div className="min-h-10 w-full max-w-xl">
          <ErrorBanner message={errorMessage} />
        </div>
      </div>
    </section>
  );
}

function isAnimatedStatus(status: InterpreterStatus): boolean {
  return (
    status === "requesting_microphone" ||
    status === "connecting" ||
    status === "listening" ||
    status === "user_speaking" ||
    status === "interpreting" ||
    status === "assistant_speaking" ||
    status === "reconnecting"
  );
}
