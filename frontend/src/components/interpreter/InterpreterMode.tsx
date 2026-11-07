"use client";

import { AudioLines, Mic, MicOff } from "lucide-react";

import { VoiceOrb } from "@/components/interpreter/VoiceOrb";
import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { useRealtimeInterpreter } from "@/hooks/useRealtimeInterpreter";
import {
  getLocalizedLanguageName,
  useUiLanguage,
  type UiMessageKey,
} from "@/lib/i18n/uiLanguage";
import type { InterpreterStatus } from "@/lib/types/interpreter";

const statusMessageKeys: Record<InterpreterStatus, UiMessageKey> = {
  idle: "interpreterIdle",
  requesting_microphone: "interpreterRequestingMicrophone",
  connecting: "interpreterConnecting",
  listening: "interpreterListening",
  user_speaking: "interpreterUserSpeaking",
  interpreting: "interpreterInterpreting",
  assistant_speaking: "interpreterAssistantSpeaking",
  muted: "interpreterMuted",
  reconnecting: "interpreterReconnecting",
  error: "interpreterError",
  stopped: "interpreterStopped",
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
  const { language, t } = useUiLanguage();
  const {
    status,
    active,
    busy,
    muted,
    inputLevel,
    outputLevel,
    errorMessage,
    start,
    toggleListening,
  } = useRealtimeInterpreter();
  const listening = active && !muted;
  const listeningControlDisabled =
    busy ||
    (active &&
      (status === "connecting" ||
        status === "reconnecting" ||
        status === "error"));

  async function handleListeningToggle() {
    if (active) {
      toggleListening();
      return;
    }

    const connected = await start();

    if (connected) {
      toggleListening();
    }
  }

  return (
    <section className="flex min-h-[calc(100dvh-76px)] flex-col items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-3xl flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-3 text-sm font-black text-[#4f5368] sm:text-base">
          <span className="whitespace-nowrap rounded-[8px] border border-[#dedee5] bg-white px-3 py-1.5 shadow-[rgba(16,24,40,0.04)_0px_1px_4px]">
            {getLocalizedLanguageName("ko", language)}
          </span>
          <AudioLines aria-hidden className="size-5 text-[#7132f5]" />
          <span className="whitespace-nowrap rounded-[8px] border border-[#dedee5] bg-white px-3 py-1.5 shadow-[rgba(16,24,40,0.04)_0px_1px_4px]">
            {getLocalizedLanguageName("zh", language)}
          </span>
        </div>

        <VoiceOrb
          status={status}
          inputLevel={inputLevel}
          outputLevel={outputLevel}
          active={active}
          busy={busy}
          muted={muted}
          onToggleListening={handleListeningToggle}
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
          {t(statusMessageKeys[status])}
        </div>

        <button
          type="button"
          aria-label={listening ? t("stopListening") : t("startListening")}
          aria-pressed={listening}
          disabled={listeningControlDisabled}
          onClick={handleListeningToggle}
          className={`inline-flex min-h-14 min-w-[184px] items-center justify-center gap-2 rounded-[12px] border px-5 text-sm font-black transition disabled:cursor-wait disabled:border-transparent disabled:bg-[#c4c6d1] disabled:text-white sm:text-base ${
            listening
              ? "border-[#f0b7b7] bg-white text-[#b42318] shadow-[rgba(16,24,40,0.04)_0px_1px_4px] hover:border-[#e78585] hover:bg-[#fff5f5]"
              : "border-transparent bg-[#7132f5] text-white shadow-[rgba(0,0,0,0.03)_0px_4px_24px] hover:bg-[#5741d8]"
          }`}
        >
          {busy ? (
            <AudioLines aria-hidden className="size-5" />
          ) : listening ? (
            <MicOff aria-hidden className="size-5" />
          ) : (
            <Mic aria-hidden className="size-5" />
          )}
          {busy ? (
            t("interpreterConnectingAction")
          ) : (
            <span className="flex flex-col items-center leading-tight">
              <span>
                {listening ? t("stopListening") : t("startListening")}
              </span>
            </span>
          )}
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
