"use client";

import { useEffect, useRef, useState } from "react";

import { LanguageSelect } from "@/components/LanguageSelect";
import { MicToggleButton } from "@/components/MicToggleButton";
import { StatusPill } from "@/components/StatusPill";
import { CaptionSizeControls } from "@/components/presentation/CaptionSizeControls";
import { FloatingCaptionLauncher } from "@/components/presentation/FloatingCaptionLauncher";
import { CaptionPreview } from "@/components/shared/CaptionPreview";
import { ErrorBanner } from "@/components/shared/ErrorBanner";
import {
  createRealtimeSession,
  endRealtimeSession,
  recordUsageEvent,
  shouldUseMockRealtime,
} from "@/lib/api/backendClient";
import {
  connectOpenAIRealtimeTranslation,
  requestMicrophoneAccess,
  type RealtimeTranslationConnection,
} from "@/lib/api/realtimeClient";
import { createUiSessionId } from "@/lib/browser/sessionId";
import { createMockPresentationEvent } from "@/lib/mock/mockRealtimeEvents";
import {
  loadFloatingCaptionSettings,
  saveFloatingCaptionSettings,
} from "@/lib/storage/captionSettingsStorage";
import type { SupportedLanguage } from "@/lib/types/language";
import type {
  PresentationCaptionEvent,
  RealtimeConnectionStatus,
} from "@/lib/types/realtime";
import { DEFAULT_FLOATING_CAPTION_SETTINGS } from "@/lib/types/settings";

const initialOutputLanguage: SupportedLanguage = "en";

export function PresentationMode() {
  const [outputLanguage, setOutputLanguage] = useState<SupportedLanguage>(
    initialOutputLanguage,
  );
  const [status, setStatus] = useState<RealtimeConnectionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionId, setSessionId] = useState("mock-session");
  const [caption, setCaption] = useState<PresentationCaptionEvent>(() =>
    createMockPresentationEvent(0, initialOutputLanguage),
  );
  const [settings, setSettings] = useState(DEFAULT_FLOATING_CAPTION_SETTINGS);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const realtimeConnectionRef = useRef<RealtimeTranslationConnection | null>(
    null,
  );
  const transcriptRef = useRef("");

  const active = status === "listening" || status === "translating";
  const busy = status === "connecting" || status === "reconnecting";

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSettings(loadFloatingCaptionSettings());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    saveFloatingCaptionSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!active || !shouldUseMockRealtime()) {
      return;
    }

    let index = 0;

    const emitMockCaption = () => {
      setStatus(index % 2 === 0 ? "listening" : "translating");
      setCaption(
        createMockPresentationEvent(index, outputLanguage, sessionId),
      );
      index += 1;
    };

    const firstTimeoutId = window.setTimeout(emitMockCaption, 0);
    const intervalId = window.setInterval(emitMockCaption, 2400);

    return () => {
      window.clearTimeout(firstTimeoutId);
      window.clearInterval(intervalId);
    };
  }, [active, outputLanguage, sessionId]);

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
    transcriptRef.current = "";

    try {
      const mediaStream = await requestMicrophoneAccess();
      mediaStreamRef.current = mediaStream;
      const uiSessionId = createUiSessionId();
      const session = await createRealtimeSession({
        mode: "presentation",
        targetLanguages: [outputLanguage],
        clientId: "anonymous",
        uiSessionId,
      });

      setSessionId(session.sessionId);

      if (!shouldUseMockRealtime()) {
        if (!mediaStream) {
          throw new Error("마이크 권한을 확인하지 못했습니다.");
        }

        setCaption(createPresentationCaption("", outputLanguage, session.sessionId));
        realtimeConnectionRef.current =
          await connectOpenAIRealtimeTranslation({
            sourceStream: mediaStream,
            clientSecret: session.clientSecret,
            onStatusChange: setStatus,
            onTranscriptDelta: (delta) => {
              transcriptRef.current += delta;
              setCaption(
                createPresentationCaption(
                  transcriptRef.current,
                  outputLanguage,
                  session.sessionId,
                ),
              );
            },
            onTranscriptFinal: (text) => {
              if (text) {
                transcriptRef.current = text;
                setCaption(
                  createPresentationCaption(
                    text,
                    outputLanguage,
                    session.sessionId,
                    true,
                  ),
                );
              }
            },
            onError: (message) => {
              setErrorMessage(message);
            },
          });
      }

      await recordUsageEvent({
        sessionId: session.sessionId,
        eventType: "session_started",
        mode: "presentation",
        timestamp: new Date().toISOString(),
      });
      setStatus("listening");
    } catch (error) {
      cleanupRealtimeConnection();
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "발표 통역 세션을 시작하지 못했습니다.",
      );
    }
  }

  async function stopSession() {
    const currentSessionId = sessionId;

    setStatus("stopped");
    cleanupRealtimeConnection();

    try {
      await endRealtimeSession({
        sessionId: currentSessionId,
        reason: "user_stop",
      });
      await recordUsageEvent({
        sessionId: currentSessionId,
        eventType: "session_stopped",
        mode: "presentation",
        timestamp: new Date().toISOString(),
      });
    } catch {
      setStatus("error");
      setErrorMessage("세션 종료 요청을 완료하지 못했습니다.");
    }
  }

  function cleanupRealtimeConnection() {
    realtimeConnectionRef.current?.close();
    realtimeConnectionRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }

  function handleOutputLanguageChange(language: SupportedLanguage) {
    setOutputLanguage(language);

    if (!active) {
      setCaption(createMockPresentationEvent(0, language, sessionId));
    }
  }

  return (
    <section className="grid min-h-[calc(100dvh-76px)] gap-4 p-3 md:p-4 lg:grid-cols-[360px_1fr]">
      <aside className="space-y-4">
        <div className="space-y-4 rounded-[8px] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <StatusPill status={status} />
            <MicToggleButton
              active={active || busy}
              disabled={status === "reconnecting"}
              onClick={handleToggle}
            />
          </div>
          <LanguageSelect
            id="presentation-output-language"
            label="출력 언어"
            value={outputLanguage}
            onChange={handleOutputLanguageChange}
          />
          <ErrorBanner message={errorMessage} />
        </div>

        <CaptionSizeControls
          settings={settings}
          onSettingsChange={setSettings}
        />

        <FloatingCaptionLauncher
          text={caption.output.text}
          language={outputLanguage}
          status={status}
          settings={settings}
          onSettingsChange={setSettings}
        />
      </aside>

      <CaptionPreview
        language={outputLanguage}
        text={caption.output.text}
        fontSize={settings.fontSize}
      />
    </section>
  );
}

function createPresentationCaption(
  text: string,
  language: SupportedLanguage,
  sessionId: string,
  isFinal = false,
): PresentationCaptionEvent {
  return {
    type: isFinal ? "caption_final" : "caption_delta",
    mode: "presentation",
    sessionId,
    output: {
      language,
      text,
    },
    isFinal,
    timestamp: new Date().toISOString(),
  };
}
