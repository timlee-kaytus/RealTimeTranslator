"use client";

import { useEffect, useRef, useState } from "react";

import { MicToggleButton } from "@/components/MicToggleButton";
import { StatusPill } from "@/components/StatusPill";
import { OpponentSubtitlePanel } from "@/components/conversation/OpponentSubtitlePanel";
import { UserSubtitlePanel } from "@/components/conversation/UserSubtitlePanel";
import { ErrorBanner } from "@/components/shared/ErrorBanner";
import {
  createRealtimeSession,
  endRealtimeSession,
  recordUsageEvent,
} from "@/lib/api/backendClient";
import { requestMicrophoneAccess } from "@/lib/api/realtimeClient";
import { createUiSessionId } from "@/lib/browser/sessionId";
import { createMockConversationEvent } from "@/lib/mock/mockRealtimeEvents";
import type { SupportedLanguage } from "@/lib/types/language";
import type {
  ConversationCaptionEvent,
  RealtimeConnectionStatus,
} from "@/lib/types/realtime";

const initialTopLanguage: SupportedLanguage = "zh";
const initialBottomLanguage: SupportedLanguage = "ko";

export function ConversationMode() {
  const [topLanguage, setTopLanguage] =
    useState<SupportedLanguage>(initialTopLanguage);
  const [bottomLanguage, setBottomLanguage] =
    useState<SupportedLanguage>(initialBottomLanguage);
  const [status, setStatus] = useState<RealtimeConnectionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionId, setSessionId] = useState("mock-session");
  const [caption, setCaption] = useState<ConversationCaptionEvent>(() =>
    createMockConversationEvent(0, initialTopLanguage, initialBottomLanguage),
  );
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const active = status === "listening" || status === "translating";
  const busy = status === "connecting" || status === "reconnecting";

  useEffect(() => {
    if (!active) {
      return;
    }

    let index = 0;

    const emitMockCaption = () => {
      setStatus(index % 2 === 0 ? "listening" : "translating");
      setCaption(
        createMockConversationEvent(
          index,
          topLanguage,
          bottomLanguage,
          sessionId,
        ),
      );
      index += 1;
    };

    const firstTimeoutId = window.setTimeout(emitMockCaption, 0);
    const intervalId = window.setInterval(emitMockCaption, 2200);

    return () => {
      window.clearTimeout(firstTimeoutId);
      window.clearInterval(intervalId);
    };
  }, [active, bottomLanguage, sessionId, topLanguage]);

  async function handleToggle() {
    if (active || busy) {
      await stopSession();
      return;
    }

    await startSession();
  }

  async function startSession() {
    setStatus("connecting");
    setErrorMessage("");

    try {
      mediaStreamRef.current = await requestMicrophoneAccess();
      const uiSessionId = createUiSessionId();
      const session = await createRealtimeSession({
        mode: "conversation",
        targetLanguages: [topLanguage, bottomLanguage],
        clientId: "anonymous",
        uiSessionId,
      });

      setSessionId(session.sessionId);
      await recordUsageEvent({
        sessionId: session.sessionId,
        eventType: "session_started",
        mode: "conversation",
        timestamp: new Date().toISOString(),
      });
      setStatus("listening");
    } catch (error) {
      stopLocalMedia();
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "통역 세션을 시작하지 못했습니다.",
      );
    }
  }

  async function stopSession() {
    const currentSessionId = sessionId;

    setStatus("stopped");
    stopLocalMedia();

    try {
      await endRealtimeSession({
        sessionId: currentSessionId,
        reason: "user_stop",
      });
      await recordUsageEvent({
        sessionId: currentSessionId,
        eventType: "session_stopped",
        mode: "conversation",
        timestamp: new Date().toISOString(),
      });
    } catch {
      setStatus("error");
      setErrorMessage("세션 종료 요청을 완료하지 못했습니다.");
    }
  }

  function stopLocalMedia() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }

  function handleTopLanguageChange(language: SupportedLanguage) {
    setTopLanguage(language);

    if (!active) {
      setCaption(
        createMockConversationEvent(0, language, bottomLanguage, sessionId),
      );
    }
  }

  function handleBottomLanguageChange(language: SupportedLanguage) {
    setBottomLanguage(language);

    if (!active) {
      setCaption(createMockConversationEvent(0, topLanguage, language, sessionId));
    }
  }

  return (
    <section className="grid min-h-[calc(100dvh-76px)] grid-rows-[1fr_auto_1fr] gap-3 p-3 md:p-4">
      <OpponentSubtitlePanel
        language={topLanguage}
        text={caption.top.text}
        onLanguageChange={handleTopLanguageChange}
      />

      <div className="flex flex-wrap items-center justify-center gap-3 rounded-[8px] border border-zinc-200 bg-white px-3 py-3 shadow-sm">
        <StatusPill status={status} />
        <MicToggleButton
          active={active || busy}
          disabled={status === "reconnecting"}
          onClick={handleToggle}
        />
        <ErrorBanner message={errorMessage} />
      </div>

      <UserSubtitlePanel
        language={bottomLanguage}
        text={caption.bottom.text}
        onLanguageChange={handleBottomLanguageChange}
      />
    </section>
  );
}
