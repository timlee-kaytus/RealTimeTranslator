"use client";

import { useEffect, useRef, useState } from "react";

import { LanguageSelect } from "@/components/LanguageSelect";
import { MicToggleButton } from "@/components/MicToggleButton";
import { StatusPill } from "@/components/StatusPill";
import { CaptionSizeControls } from "@/components/presentation/CaptionSizeControls";
import { FloatingCaptionLauncher } from "@/components/presentation/FloatingCaptionLauncher";
import { PresentationSessionTimer } from "@/components/presentation/PresentationSessionTimer";
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
  getRealtimeUserMessage,
  getSessionExpiredMessage,
  requestMicrophoneAccess,
  type RealtimeTranslationConnection,
} from "@/lib/api/realtimeClient";
import { createUiSessionId } from "@/lib/browser/sessionId";
import { nowEpochMilliseconds } from "@/lib/browser/time";
import { CaptionBuffer } from "@/lib/caption/captionBuffer";
import {
  CAPTION_IDLE_COMMIT_MS,
  getCaptionDisplayFontSize,
} from "@/lib/caption/captionDisplayPolicy";
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
const maxSessionSeconds = 15 * 60;
const sessionWarningSeconds = 60;

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
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const realtimeConnectionRef = useRef<RealtimeTranslationConnection | null>(
    null,
  );
  const captionBufferRef = useRef(
    new CaptionBuffer({
      mode: "presentation",
      language: initialOutputLanguage,
    }),
  );
  const captionIdleCommitTimeoutRef = useRef<number | null>(null);
  const sessionExpireTimeoutRef = useRef<number | null>(null);
  const activeSessionIdRef = useRef(sessionId);

  const active = status === "listening" || status === "translating";
  const busy = status === "connecting" || status === "reconnecting";
  const sessionTimerRunning = sessionStartedAt !== null && (active || busy);
  const captionFontSize = getCaptionDisplayFontSize({
    mode: "presentation",
    language: outputLanguage,
    text: caption.output.text,
    preferredFontSize: settings.fontSize,
  });

  useEffect(() => {
    return () => {
      realtimeConnectionRef.current?.close();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      clearCaptionIdleCommit();

      if (sessionExpireTimeoutRef.current !== null) {
        window.clearTimeout(sessionExpireTimeoutRef.current);
      }
    };
  }, []);

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
    if (sessionStartedAt === null || !sessionTimerRunning) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const nextElapsedSeconds = Math.min(
        maxSessionSeconds,
        Math.floor((nowEpochMilliseconds() - sessionStartedAt) / 1000),
      );
      setElapsedSeconds(nextElapsedSeconds);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [sessionStartedAt, sessionTimerRunning]);

  useEffect(() => {
    if (!active || !shouldUseMockRealtime()) {
      return;
    }

    let index = 0;

    const emitMockCaption = () => {
      setStatus(index % 2 === 0 ? "listening" : "translating");
      const mockCaption = createMockPresentationEvent(
        index,
        outputLanguage,
        sessionId,
      );
      const displayState = captionBufferRef.current.appendDelta(
        mockCaption.output.text,
      );
      const finalDisplayState = captionBufferRef.current.commitCurrentBlock();

      setCaption(
        createPresentationCaption(
          finalDisplayState.currentBlock.text || displayState.currentBlock.text,
          outputLanguage,
          sessionId,
          true,
        ),
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
    resetCaptionBuffer(outputLanguage);

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
      activeSessionIdRef.current = session.sessionId;
      startSessionTimer();

      if (!shouldUseMockRealtime()) {
        if (!mediaStream) {
          throw new Error("마이크 권한을 확인하지 못했습니다.");
        }

        setCaption(
          createPresentationCaption("", outputLanguage, session.sessionId),
        );
        realtimeConnectionRef.current =
          await connectOpenAIRealtimeTranslation({
            sourceStream: mediaStream,
            clientSecret: session.clientSecret,
            onStatusChange: setStatus,
            onTranscriptDelta: (delta) => {
              const displayState = captionBufferRef.current.appendDelta(delta);

              setCaption(
                createPresentationCaption(
                  displayState.currentBlock.text,
                  outputLanguage,
                  session.sessionId,
                  displayState.currentBlock.isFinal,
                ),
              );
              scheduleCaptionIdleCommit(outputLanguage, session.sessionId);
            },
            onTranscriptFinal: (text) => {
              if (text) {
                clearCaptionIdleCommit();
                const displayState =
                  captionBufferRef.current.replaceWithFinalText(text);

                setCaption(
                  createPresentationCaption(
                    displayState.currentBlock.text,
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
      stopSessionTimer();
      resetCaptionBuffer(outputLanguage);
      setStatus("error");
      setErrorMessage(getRealtimeUserMessage(error));
    }
  }

  async function stopSession(
    reason: "user_stop" | "session_expired" = "user_stop",
  ) {
    const currentSessionId = activeSessionIdRef.current;

    setStatus("stopped");
    cleanupRealtimeConnection();
    stopSessionTimer();
    resetCaptionBuffer(outputLanguage);
    setCaption(createPresentationCaption("", outputLanguage, currentSessionId));

    if (reason === "user_stop") {
      setErrorMessage("");
    }

    try {
      await endRealtimeSession({
        sessionId: currentSessionId,
        reason,
      });
      await recordUsageEvent({
        sessionId: currentSessionId,
        eventType: "session_stopped",
        mode: "presentation",
        timestamp: new Date().toISOString(),
      });
    } catch {
      if (reason !== "session_expired") {
        setStatus("error");
        setErrorMessage(getRealtimeUserMessage("network"));
      }
    }
  }

  function cleanupRealtimeConnection() {
    clearCaptionIdleCommit();
    realtimeConnectionRef.current?.close();
    realtimeConnectionRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }

  function startSessionTimer() {
    clearSessionExpireTimeout();
    setElapsedSeconds(0);
    setSessionStartedAt(nowEpochMilliseconds());
    sessionExpireTimeoutRef.current = window.setTimeout(() => {
      setElapsedSeconds(maxSessionSeconds);
      setErrorMessage(getSessionExpiredMessage());
      void stopSession("session_expired");
    }, maxSessionSeconds * 1000);
  }

  function stopSessionTimer() {
    clearSessionExpireTimeout();
    setSessionStartedAt(null);
  }

  function clearSessionExpireTimeout() {
    if (sessionExpireTimeoutRef.current !== null) {
      window.clearTimeout(sessionExpireTimeoutRef.current);
      sessionExpireTimeoutRef.current = null;
    }
  }

  function handleOutputLanguageChange(language: SupportedLanguage) {
    setOutputLanguage(language);
    resetCaptionBuffer(language);

    if (!active) {
      const mockCaption = createMockPresentationEvent(0, language, sessionId);
      const displayState = captionBufferRef.current.replaceWithFinalText(
        mockCaption.output.text,
      );

      setCaption(
        createPresentationCaption(
          displayState.currentBlock.text,
          language,
          sessionId,
          true,
        ),
      );
    }
  }

  function scheduleCaptionIdleCommit(
    language: SupportedLanguage,
    currentSessionId: string,
  ) {
    clearCaptionIdleCommit();
    captionIdleCommitTimeoutRef.current = window.setTimeout(() => {
      const displayState = captionBufferRef.current.commitCurrentBlock();

      setCaption(
        createPresentationCaption(
          displayState.currentBlock.text,
          language,
          currentSessionId,
          true,
        ),
      );
    }, CAPTION_IDLE_COMMIT_MS);
  }

  function clearCaptionIdleCommit() {
    if (captionIdleCommitTimeoutRef.current !== null) {
      window.clearTimeout(captionIdleCommitTimeoutRef.current);
      captionIdleCommitTimeoutRef.current = null;
    }
  }

  function resetCaptionBuffer(language: SupportedLanguage) {
    clearCaptionIdleCommit();
    captionBufferRef.current.setLanguage(language);
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

        <PresentationSessionTimer
          elapsedSeconds={elapsedSeconds}
          maxSeconds={maxSessionSeconds}
          warningSeconds={sessionWarningSeconds}
          running={sessionTimerRunning}
        />

        <CaptionSizeControls
          settings={settings}
          onSettingsChange={setSettings}
        />

        <FloatingCaptionLauncher
          text={caption.output.text}
          language={outputLanguage}
          status={status}
          settings={settings}
          fontSize={captionFontSize}
          onSettingsChange={setSettings}
        />
      </aside>

      <CaptionPreview
        language={outputLanguage}
        text={caption.output.text}
        fontSize={captionFontSize}
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
