"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { MicToggleButton } from "@/components/MicToggleButton";
import { ConversationActivityHint } from "@/components/conversation/ConversationActivityHint";
import { MicLevelMeter } from "@/components/conversation/MicLevelMeter";
import { CaptionSizeControls } from "@/components/presentation/CaptionSizeControls";
import { FloatingCaptionLauncher } from "@/components/presentation/FloatingCaptionLauncher";
import { CaptionPreview } from "@/components/shared/CaptionPreview";
import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { useMicrophoneLevel } from "@/hooks/useMicrophoneLevel";
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
import { CaptionBuffer } from "@/lib/caption/captionBuffer";
import {
  CAPTION_IDLE_COMMIT_MS,
  getCaptionDisplayFontSize,
} from "@/lib/caption/captionDisplayPolicy";
import { normalizeCaptionText } from "@/lib/caption/normalizeCaptionText";
import { createMockPresentationEvent } from "@/lib/mock/mockRealtimeEvents";
import {
  loadFloatingCaptionSettings,
  saveFloatingCaptionSettings,
} from "@/lib/storage/captionSettingsStorage";
import {
  detectSupportedLanguage,
  type DetectedSupportedLanguage,
} from "@/lib/language/detectSupportedLanguage";
import { REALTIME_TRANSLATION_INSTRUCTIONS } from "@/lib/translation/realtimeTranslationInstructions";
import {
  LANGUAGE_FLAG_LABELS,
  LANGUAGE_LABELS,
  LANGUAGE_SELECT_LABELS,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/lib/types/language";
import type {
  ConversationActivityStatus,
  PresentationCaptionEvent,
  RealtimeConnectionStatus,
  RealtimeSessionCredential,
} from "@/lib/types/realtime";
import { DEFAULT_FLOATING_CAPTION_SETTINGS } from "@/lib/types/settings";

const initialOutputLanguage: SupportedLanguage = "ko";
const initialSecondaryOutputLanguage: PresentationSecondaryLanguage = "none";
const maxSessionSeconds = 15 * 60;
const WARMUP_MS = 1000;
const READY_VISIBLE_MS = 900;
const MOCK_FIRST_CAPTION_DELAY_MS = WARMUP_MS + READY_VISIBLE_MS + 200;

type PresentationSessionRole = "primary" | "secondary";
type PresentationSecondaryLanguage = SupportedLanguage | "none";
type PresentationSessionStatuses = Partial<
  Record<PresentationSessionRole, RealtimeConnectionStatus>
>;
type PresentationRoleCaptionState = {
  text: string;
  isFinal: boolean;
};
type PresentationSourceCaptionState = PresentationRoleCaptionState & {
  detectedLanguage: DetectedSupportedLanguage;
};

export function PresentationMode() {
  const [outputLanguage, setOutputLanguage] = useState<SupportedLanguage>(
    initialOutputLanguage,
  );
  const [secondaryOutputLanguage, setSecondaryOutputLanguage] =
    useState<PresentationSecondaryLanguage>(initialSecondaryOutputLanguage);
  const [status, setStatus] = useState<RealtimeConnectionStatus>("stopped");
  const [activityStatus, setActivityStatus] =
    useState<ConversationActivityStatus>("stopped");
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionId, setSessionId] = useState("mock-session");
  const sessionIdRef = useRef("mock-session");
  const [caption, setCaption] = useState<PresentationCaptionEvent>(() =>
    createMockPresentationEvent(0, initialOutputLanguage),
  );
  const [settings, setSettings] = useState(DEFAULT_FLOATING_CAPTION_SETTINGS);
  const {
    level: micLevel,
    speaking: isSpeaking,
    start: startMicrophoneLevel,
    stop: stopMicrophoneLevel,
  } = useMicrophoneLevel();
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const realtimeConnectionsRef = useRef<
    Partial<Record<PresentationSessionRole, RealtimeTranslationConnection>>
  >({});
  const outputLanguageRef = useRef(outputLanguage);
  const secondaryOutputLanguageRef = useRef(secondaryOutputLanguage);
  const captionBuffersRef = useRef<Record<PresentationSessionRole, CaptionBuffer>>(
    {
      primary: new CaptionBuffer({
        mode: "presentation",
        language: initialOutputLanguage,
      }),
      secondary: new CaptionBuffer({
        mode: "presentation",
        language: "en",
      }),
    },
  );
  const sourceCaptionBufferRef = useRef(
    new CaptionBuffer({
      mode: "presentation",
      language: initialOutputLanguage,
    }),
  );
  const sourceRawTranscriptRef = useRef("");
  const sourceCaptionStateRef = useRef<PresentationSourceCaptionState>(
    createEmptySourceCaptionState(),
  );
  const translatedCaptionStateRef = useRef<
    Record<PresentationSessionRole, PresentationRoleCaptionState>
  >(createEmptyTranslatedCaptionState());
  const captionIdleCommitTimeoutsRef = useRef<
    Partial<Record<PresentationSessionRole, number>>
  >({});
  const sourceCaptionIdleCommitTimeoutRef = useRef<number | null>(null);
  const sessionExpireTimeoutRef = useRef<number | null>(null);
  const sessionStatusesRef = useRef<PresentationSessionStatuses>({});
  const activeSessionIdsRef = useRef<string[]>([]);
  const warmupTimeoutRef = useRef<number | null>(null);
  const readyTimeoutRef = useRef<number | null>(null);

  const active = status === "listening" || status === "translating";
  const busy = status === "connecting" || status === "reconnecting";
  const selectedOutputLanguages = getPresentationOutputLanguages(
    outputLanguage,
    secondaryOutputLanguage,
  );
  const selectedSecondaryOutputLanguage =
    secondaryOutputLanguage === "none" ? null : secondaryOutputLanguage;
  const secondaryOutput = caption.secondaryOutput;
  const secondaryOutputText =
    selectedSecondaryOutputLanguage === null ? undefined : secondaryOutput?.text ?? "";
  const captionFontSize = getCaptionDisplayFontSize({
    mode: "presentation",
    language: outputLanguage,
    text: caption.output.text,
    preferredFontSize: settings.fontSize,
  });
  const secondaryCaptionFontSize =
    selectedSecondaryOutputLanguage === null
      ? undefined
      : getCaptionDisplayFontSize({
          mode: "presentation",
          language: selectedSecondaryOutputLanguage,
          text: secondaryOutputText ?? "",
          preferredFontSize: settings.fontSize,
        });

  const clearPresentationActivityTimers = useCallback(() => {
    clearTimeoutRef(warmupTimeoutRef);
    clearTimeoutRef(readyTimeoutRef);
  }, []);

  const startActivityWarmup = useCallback(() => {
    clearPresentationActivityTimers();
    setActivityStatus("warming_up");

    warmupTimeoutRef.current = window.setTimeout(() => {
      warmupTimeoutRef.current = null;
      setActivityStatus("ready");

      readyTimeoutRef.current = window.setTimeout(() => {
        readyTimeoutRef.current = null;
        setActivityStatus((currentStatus) =>
          currentStatus === "ready" ? "listening" : currentStatus,
        );
      }, READY_VISIBLE_MS);
    }, WARMUP_MS);
  }, [clearPresentationActivityTimers]);

  const markActivityTranslating = useCallback(() => {
    clearPresentationActivityTimers();
    setActivityStatus("translating");
  }, [clearPresentationActivityTimers]);

  const returnActivityToListening = useCallback(() => {
    setActivityStatus((currentStatus) =>
      currentStatus === "translating" || currentStatus === "ready"
        ? "listening"
        : currentStatus,
    );
  }, []);

  const clearCaptionIdleCommit = useCallback((role: PresentationSessionRole) => {
    const timeoutId = captionIdleCommitTimeoutsRef.current[role];

    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      delete captionIdleCommitTimeoutsRef.current[role];
    }
  }, []);

  const clearAllCaptionIdleCommits = useCallback(() => {
    clearCaptionIdleCommit("primary");
    clearCaptionIdleCommit("secondary");
    clearTimeoutRef(sourceCaptionIdleCommitTimeoutRef);
  }, [clearCaptionIdleCommit]);

  useEffect(() => {
    const sourceCaptionBuffer = sourceCaptionBufferRef.current;

    return () => {
      Object.values(realtimeConnectionsRef.current).forEach((connection) => {
        connection?.close();
      });
      realtimeConnectionsRef.current = {};
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      stopMicrophoneLevel();
      clearPresentationActivityTimers();
      clearAllCaptionIdleCommits();
      sourceCaptionBuffer.clear();

      if (sessionExpireTimeoutRef.current !== null) {
        window.clearTimeout(sessionExpireTimeoutRef.current);
      }
    };
  }, [
    clearAllCaptionIdleCommits,
    clearPresentationActivityTimers,
    stopMicrophoneLevel,
  ]);

  useEffect(() => {
    outputLanguageRef.current = outputLanguage;
    secondaryOutputLanguageRef.current = secondaryOutputLanguage;
  }, [outputLanguage, secondaryOutputLanguage]);

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
      const nextStatus = index % 2 === 0 ? "listening" : "translating";
      setStatus(nextStatus);

      if (nextStatus === "translating") {
        markActivityTranslating();
      } else {
        setActivityStatus((currentStatus) =>
          currentStatus === "stopped" || currentStatus === "error"
            ? currentStatus
            : "listening",
        );
      }

      const mockCaption = createMockPresentationEvent(
        index,
        outputLanguage,
        sessionId,
        secondaryOutputLanguage === "none" ? undefined : secondaryOutputLanguage,
      );
      const primaryDisplayState = captionBuffersRef.current.primary.appendDelta(
        mockCaption.output.text,
      );
      const finalPrimaryDisplayState =
        captionBuffersRef.current.primary.commitCurrentBlock();
      const secondaryDisplayState = mockCaption.secondaryOutput
        ? captionBuffersRef.current.secondary.appendDelta(
            mockCaption.secondaryOutput.text,
          )
        : null;
      const finalSecondaryDisplayState = mockCaption.secondaryOutput
        ? captionBuffersRef.current.secondary.commitCurrentBlock()
        : null;

      setCaption(
        createPresentationCaption(
          finalPrimaryDisplayState.currentBlock.text ||
            primaryDisplayState.currentBlock.text,
          outputLanguage,
          sessionId,
          true,
          mockCaption.secondaryOutput
            ? {
                language: mockCaption.secondaryOutput.language,
                text:
                  finalSecondaryDisplayState?.currentBlock.text ||
                  secondaryDisplayState?.currentBlock.text ||
                  "",
            }
            : undefined,
          mockCaption.detectedLanguage,
        ),
      );
      index += 1;
    };

    const firstTimeoutId = window.setTimeout(
      emitMockCaption,
      MOCK_FIRST_CAPTION_DELAY_MS,
    );
    const intervalId = window.setInterval(emitMockCaption, 2400);

    return () => {
      window.clearTimeout(firstTimeoutId);
      window.clearInterval(intervalId);
    };
  }, [
    active,
    markActivityTranslating,
    outputLanguage,
    secondaryOutputLanguage,
    sessionId,
  ]);

  async function handleToggle() {
    if (active || busy) {
      await stopSession();
      return;
    }

    await startSession();
  }

  async function startSession() {
    setStatus("connecting");
    setActivityStatus("connecting");
    setErrorMessage("");
    clearPresentationActivityTimers();
    stopMicrophoneLevel();
    resetPresentationState("connecting");

    try {
      const mediaStream = await requestMicrophoneAccess();

      if (!mediaStream) {
        throw new Error("마이크 권한을 확인하지 못했습니다.");
      }

      mediaStreamRef.current = mediaStream;
      startMicrophoneLevel(mediaStream);
      const uiSessionId = createUiSessionId();
      const session = await createRealtimeSession({
        mode: "presentation",
        targetLanguages: selectedOutputLanguages,
        clientId: "anonymous",
        uiSessionId,
        translationInstructions: REALTIME_TRANSLATION_INSTRUCTIONS,
      });

      sessionIdRef.current = session.sessionId;
      setSessionId(session.sessionId);
      startSessionTimer();
      setCaption(
        createPresentationCaption(
          "",
          outputLanguage,
          session.sessionId,
          false,
          secondaryOutputLanguage === "none"
            ? undefined
            : {
                language: secondaryOutputLanguage,
                text: "",
              },
        ),
      );

      if (shouldUseMockRealtime()) {
        activeSessionIdsRef.current = session.sessions.map(
          (realtimeSession) => realtimeSession.sessionId,
        );
        await recordSessionUsage(
          activeSessionIdsRef.current,
          "session_started",
        );
        setStatus("listening");
        startActivityWarmup();
        return;
      }

      const presentationSessions = selectedOutputLanguages.map(
        (language, index) => ({
          role: index === 0 ? ("primary" as const) : ("secondary" as const),
          credential: readPresentationSession(session.sessions, language, index),
        }),
      );
      activeSessionIdsRef.current = uniqueSessionIds(
        presentationSessions.map(({ credential }) => credential.sessionId),
      );

      const connectionResults = await Promise.allSettled(
        presentationSessions.map(({ role, credential }) =>
          connectPresentationSession(
            role,
            credential,
            mediaStream,
            role === "primary",
          ),
        ),
      );
      const failedConnection = connectionResults.find(
        (result) => result.status === "rejected",
      );

      if (failedConnection?.status === "rejected") {
        throw failedConnection.reason;
      }

      await recordSessionUsage(activeSessionIdsRef.current, "session_started");
      setStatus("listening");
      startActivityWarmup();
    } catch (error) {
      const sessionIds = activeSessionIdsRef.current;

      cleanupRealtimeConnection();
      await Promise.allSettled(
        sessionIds.map((currentSessionId) =>
          endRealtimeSession({
            sessionId: currentSessionId,
            reason: "error",
          }),
        ),
      );
      stopSessionTimer();
      resetCaptionBuffers(outputLanguage, secondaryOutputLanguage);
      setStatus("error");
      setActivityStatus("error");
      setErrorMessage(getRealtimeUserMessage(error));
    }
  }

  async function stopSession(
    reason: "user_stop" | "session_expired" = "user_stop",
  ) {
    const currentSessionIds = activeSessionIdsRef.current;
    const currentSessionId = currentSessionIds[0] ?? sessionId;

    setStatus("stopped");
    setActivityStatus("stopped");
    clearPresentationActivityTimers();
    cleanupRealtimeConnection();
    stopSessionTimer();
    resetCaptionBuffers(outputLanguage, secondaryOutputLanguage);
    setCaption(
      createPresentationCaption(
        "",
        outputLanguage,
        currentSessionId,
        false,
        secondaryOutputLanguage === "none"
          ? undefined
          : {
              language: secondaryOutputLanguage,
              text: "",
            },
      ),
    );

    if (reason === "user_stop") {
      setErrorMessage("");
    }

    try {
      await Promise.all(
        currentSessionIds.map((sessionId) =>
          endRealtimeSession({
            sessionId,
            reason,
          }),
        ),
      );
      await recordSessionUsage(currentSessionIds, "session_stopped");
    } catch {
      if (reason !== "session_expired") {
        setStatus("error");
        setActivityStatus("error");
        setErrorMessage(getRealtimeUserMessage("network"));
      }
    }
  }

  function cleanupRealtimeConnection() {
    clearAllCaptionIdleCommits();
    Object.values(realtimeConnectionsRef.current).forEach((connection) => {
      connection?.close();
    });
    realtimeConnectionsRef.current = {};
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    stopMicrophoneLevel();
    sessionStatusesRef.current = {};
    activeSessionIdsRef.current = [];
  }

  function startSessionTimer() {
    clearSessionExpireTimeout();
    sessionExpireTimeoutRef.current = window.setTimeout(() => {
      setErrorMessage(getSessionExpiredMessage());
      void stopSession("session_expired");
    }, maxSessionSeconds * 1000);
  }

  function stopSessionTimer() {
    clearSessionExpireTimeout();
  }

  function clearSessionExpireTimeout() {
    if (sessionExpireTimeoutRef.current !== null) {
      window.clearTimeout(sessionExpireTimeoutRef.current);
      sessionExpireTimeoutRef.current = null;
    }
  }

  function handleOutputLanguageChange(language: SupportedLanguage) {
    setOutputLanguage(language);
    resetCaptionBuffers(language, secondaryOutputLanguage);

    if (!active) {
      updateIdlePreview(language, secondaryOutputLanguage);
    }
  }

  function handleSecondaryOutputLanguageChange(
    language: PresentationSecondaryLanguage,
  ) {
    setSecondaryOutputLanguage(language);
    resetCaptionBuffers(outputLanguage, language);

    if (!active) {
      updateIdlePreview(outputLanguage, language);
    }
  }

  function updateIdlePreview(
    primaryLanguage: SupportedLanguage,
    secondaryLanguage: PresentationSecondaryLanguage,
  ) {
    const mockCaption = createMockPresentationEvent(
      0,
      primaryLanguage,
      sessionId,
      secondaryLanguage === "none" ? undefined : secondaryLanguage,
    );
    const primaryDisplayState =
      captionBuffersRef.current.primary.replaceWithFinalText(
        mockCaption.output.text,
      );
    const secondaryDisplayState = mockCaption.secondaryOutput
      ? captionBuffersRef.current.secondary.replaceWithFinalText(
          mockCaption.secondaryOutput.text,
        )
      : null;

    setCaption(
      createPresentationCaption(
        primaryDisplayState.currentBlock.text,
        primaryLanguage,
        sessionId,
        true,
        mockCaption.secondaryOutput
          ? {
              language: mockCaption.secondaryOutput.language,
              text: secondaryDisplayState?.currentBlock.text ?? "",
            }
          : undefined,
        mockCaption.detectedLanguage,
      ),
    );
  }

  async function connectPresentationSession(
    role: PresentationSessionRole,
    realtimeSession: RealtimeSessionCredential,
    mediaStream: MediaStream,
    captureSourceTranscript: boolean,
  ): Promise<RealtimeTranslationConnection> {
    handlePresentationSessionStatusChange(role, "connecting");

    const connection = await connectOpenAIRealtimeTranslation({
      sourceStream: mediaStream,
      clientSecret: realtimeSession.clientSecret,
      stopSourceTracksOnClose: false,
      onStatusChange: (nextStatus) => {
        handlePresentationSessionStatusChange(role, nextStatus);
      },
      onInputTranscriptDelta: captureSourceTranscript
        ? (delta) => {
            handleSourceTranscriptDelta(delta);
          }
        : undefined,
      onInputTranscriptFinal: captureSourceTranscript
        ? (text) => {
            handleSourceTranscriptFinal(text);
          }
        : undefined,
      onTranscriptDelta: (delta) => {
        markActivityTranslating();
        const displayState = captionBuffersRef.current[role].appendDelta(delta);
        updateTranslatedCaptionState(
          role,
          displayState.currentBlock.text,
          displayState.currentBlock.isFinal,
        );
        syncPresentationCaption(displayState.currentBlock.isFinal);
        scheduleCaptionIdleCommit(role);
      },
      onTranscriptFinal: (text) => {
        returnActivityToListening();

        if (!text) {
          return;
        }

        clearCaptionIdleCommit(role);
        const displayState =
          captionBuffersRef.current[role].replaceWithFinalText(text);

        updateTranslatedCaptionState(role, displayState.currentBlock.text, true);
        syncPresentationCaption(true);
      },
      onError: (message) => {
        clearPresentationActivityTimers();
        setActivityStatus("error");
        setErrorMessage(message);
      },
    });

    realtimeConnectionsRef.current = {
      ...realtimeConnectionsRef.current,
      [role]: connection,
    };

    return connection;
  }

  function handlePresentationSessionStatusChange(
    role: PresentationSessionRole,
    nextStatus: RealtimeConnectionStatus,
  ) {
    sessionStatusesRef.current = {
      ...sessionStatusesRef.current,
      [role]: nextStatus,
    };
    const derivedStatus = derivePresentationStatus(sessionStatusesRef.current);
    setStatus(derivedStatus);

    if (
      derivedStatus === "connecting" ||
      derivedStatus === "reconnecting" ||
      derivedStatus === "error" ||
      derivedStatus === "stopped"
    ) {
      clearPresentationActivityTimers();
      setActivityStatus(derivedStatus);
    }
  }

  function handleSourceTranscriptDelta(delta: string) {
    if (!delta.trim()) {
      return;
    }

    if (
      sourceCaptionStateRef.current.isFinal &&
      sourceRawTranscriptRef.current.trim()
    ) {
      resetSourceCaptionState(outputLanguageRef.current);
    }

    const detectedLanguage = detectSupportedLanguage(
      `${sourceRawTranscriptRef.current}${delta}`,
    );
    const appendLanguage =
      detectedLanguage === "unknown"
        ? sourceCaptionStateRef.current.detectedLanguage
        : detectedLanguage;
    const nextRawText = appendPresentationTranscriptText(
      sourceRawTranscriptRef.current,
      delta,
      appendLanguage,
    );

    applySourceTranscriptText(nextRawText, false);
    scheduleSourceCaptionIdleCommit();
  }

  function handleSourceTranscriptFinal(text: string) {
    const finalText = text.trim() ? text : sourceRawTranscriptRef.current;

    if (!finalText.trim()) {
      return;
    }

    clearTimeoutRef(sourceCaptionIdleCommitTimeoutRef);
    applySourceTranscriptText(finalText, true);
  }

  function applySourceTranscriptText(text: string, isFinal: boolean) {
    sourceRawTranscriptRef.current = text;

    const detectedLanguage = detectSupportedLanguage(text);
    const nextDetectedLanguage =
      detectedLanguage === "unknown"
        ? sourceCaptionStateRef.current.detectedLanguage
        : detectedLanguage;

    if (sourceCaptionStateRef.current.detectedLanguage !== nextDetectedLanguage) {
      sourceCaptionBufferRef.current.setLanguage(
        nextDetectedLanguage === "unknown"
          ? outputLanguageRef.current
          : nextDetectedLanguage,
      );
    }

    const displayState = isFinal
      ? sourceCaptionBufferRef.current.replaceWithFinalText(text)
      : sourceCaptionBufferRef.current.replaceCurrentText(text);

    sourceCaptionStateRef.current = {
      detectedLanguage: nextDetectedLanguage,
      text: displayState.currentBlock.text,
      isFinal: isFinal || displayState.currentBlock.isFinal,
    };
    syncPresentationCaption(isFinal || displayState.currentBlock.isFinal);
  }

  function updateTranslatedCaptionState(
    role: PresentationSessionRole,
    text: string,
    isFinal: boolean,
  ) {
    translatedCaptionStateRef.current = {
      ...translatedCaptionStateRef.current,
      [role]: {
        text,
        isFinal,
      },
    };
  }

  function syncPresentationCaption(isFinal = false) {
    const primaryLanguage = outputLanguageRef.current;
    const secondaryLanguage = secondaryOutputLanguageRef.current;
    const primaryCaption = resolvePresentationRoleCaption(
      "primary",
      primaryLanguage,
    );
    const secondaryCaption =
      secondaryLanguage === "none"
        ? undefined
        : {
            language: secondaryLanguage,
            ...resolvePresentationRoleCaption("secondary", secondaryLanguage),
          };

    setCaption(
      createPresentationCaption(
        primaryCaption.text,
        primaryLanguage,
        sessionIdRef.current,
        isFinal || primaryCaption.isFinal || Boolean(secondaryCaption?.isFinal),
        secondaryCaption
          ? {
              language: secondaryCaption.language,
              text: secondaryCaption.text,
            }
          : undefined,
        sourceCaptionStateRef.current.detectedLanguage,
      ),
    );
  }

  function resolvePresentationRoleCaption(
    role: PresentationSessionRole,
    language: SupportedLanguage,
  ): PresentationRoleCaptionState {
    const sourceCaption = sourceCaptionStateRef.current;

    if (
      sourceCaption.detectedLanguage === language &&
      sourceCaption.text.trim()
    ) {
      return {
        text: sourceCaption.text,
        isFinal: sourceCaption.isFinal,
      };
    }

    return translatedCaptionStateRef.current[role];
  }

  function scheduleCaptionIdleCommit(role: PresentationSessionRole) {
    clearCaptionIdleCommit(role);
    captionIdleCommitTimeoutsRef.current[role] = window.setTimeout(() => {
      const displayState = captionBuffersRef.current[role].commitCurrentBlock();

      updateTranslatedCaptionState(role, displayState.currentBlock.text, true);
      syncPresentationCaption(true);
    }, CAPTION_IDLE_COMMIT_MS);
  }

  function scheduleSourceCaptionIdleCommit() {
    clearTimeoutRef(sourceCaptionIdleCommitTimeoutRef);
    sourceCaptionIdleCommitTimeoutRef.current = window.setTimeout(() => {
      sourceCaptionIdleCommitTimeoutRef.current = null;

      if (!sourceRawTranscriptRef.current.trim()) {
        return;
      }

      const displayState = sourceCaptionBufferRef.current.commitCurrentBlock();

      sourceCaptionStateRef.current = {
        ...sourceCaptionStateRef.current,
        text: displayState.currentBlock.text,
        isFinal: true,
      };
      syncPresentationCaption(true);
    }, CAPTION_IDLE_COMMIT_MS);
  }

  function resetCaptionBuffers(
    primaryLanguage: SupportedLanguage,
    secondaryLanguage: PresentationSecondaryLanguage,
  ) {
    clearAllCaptionIdleCommits();
    captionBuffersRef.current.primary.setLanguage(primaryLanguage);
    captionBuffersRef.current.secondary.clear();
    resetSourceCaptionState(primaryLanguage);
    translatedCaptionStateRef.current = createEmptyTranslatedCaptionState();

    if (secondaryLanguage !== "none") {
      captionBuffersRef.current.secondary.setLanguage(secondaryLanguage);
    }
  }

  function resetSourceCaptionState(language: SupportedLanguage) {
    sourceRawTranscriptRef.current = "";
    sourceCaptionStateRef.current = createEmptySourceCaptionState();
    sourceCaptionBufferRef.current.setLanguage(language);
  }

  function resetPresentationState(nextStatus: RealtimeConnectionStatus) {
    resetCaptionBuffers(outputLanguage, secondaryOutputLanguage);
    sessionStatusesRef.current = selectedOutputLanguages.reduce(
      (statuses, _language, index) => ({
        ...statuses,
        [index === 0 ? "primary" : "secondary"]: nextStatus,
      }),
      {} as PresentationSessionStatuses,
    );
    activeSessionIdsRef.current = [];
  }

  return (
    <section className="grid min-h-[calc(100dvh-76px)] content-start gap-4 p-3 md:p-4">
      <div className="rtt-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PresentationOutputLanguageSelect
            primaryLanguage={outputLanguage}
            secondaryLanguage={secondaryOutputLanguage}
            onPrimaryChange={handleOutputLanguageChange}
            onSecondaryChange={handleSecondaryOutputLanguageChange}
          />
          <div className="flex flex-wrap items-center justify-end gap-3">
            <MicLevelMeter
              disabled={!active && !busy}
              level={micLevel}
              speaking={isSpeaking}
            />
            <ConversationActivityHint status={activityStatus} />
            <MicToggleButton
              active={active || busy}
              disabled={status === "reconnecting"}
              onClick={handleToggle}
            />
          </div>
        </div>
        <ErrorBanner message={errorMessage} />
      </div>

      <CaptionPreview
        language={outputLanguage}
        text={caption.output.text}
        fontSize={captionFontSize}
        secondaryLanguage={selectedSecondaryOutputLanguage}
        secondaryText={secondaryOutputText}
        secondaryFontSize={secondaryCaptionFontSize}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <CaptionSizeControls
          settings={settings}
          onSettingsChange={setSettings}
        />

        <FloatingCaptionLauncher
          text={caption.output.text}
          language={outputLanguage}
          secondaryText={secondaryOutputText}
          secondaryLanguage={selectedSecondaryOutputLanguage}
          settings={settings}
          fontSize={captionFontSize}
          secondaryFontSize={secondaryCaptionFontSize}
          onSettingsChange={setSettings}
        />
      </div>
    </section>
  );
}

type PresentationOutputLanguageSelectProps = {
  primaryLanguage: SupportedLanguage;
  secondaryLanguage: PresentationSecondaryLanguage;
  onPrimaryChange: (language: SupportedLanguage) => void;
  onSecondaryChange: (language: PresentationSecondaryLanguage) => void;
};

function PresentationOutputLanguageSelect({
  primaryLanguage,
  secondaryLanguage,
  onPrimaryChange,
  onSecondaryChange,
}: PresentationOutputLanguageSelectProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-[#686b82]">
      <label
        htmlFor="presentation-output-language-primary"
        className="flex items-center gap-2 whitespace-nowrap"
      >
        <span>출력언어1(输出语言1)</span>
        <select
          id="presentation-output-language-primary"
          value={primaryLanguage}
          aria-label={`출력언어1 ${LANGUAGE_LABELS[primaryLanguage]}`}
          onChange={(event) =>
            onPrimaryChange(event.target.value as SupportedLanguage)
          }
          className="rtt-select h-10 w-16 px-2 text-center text-xl font-semibold"
        >
          {SUPPORTED_LANGUAGES.map((language) => (
            <option
              key={language}
              value={language}
              aria-label={LANGUAGE_SELECT_LABELS[language]}
            >
              {LANGUAGE_FLAG_LABELS[language]}
            </option>
          ))}
        </select>
      </label>
      <label
        htmlFor="presentation-output-language-secondary"
        className="flex items-center gap-2 whitespace-nowrap"
      >
        <span>출력언어2(输出语言2)</span>
        <select
          id="presentation-output-language-secondary"
          value={secondaryLanguage}
          aria-label={
            secondaryLanguage === "none"
              ? "출력언어2 없음(无)"
              : `출력언어2 ${LANGUAGE_LABELS[secondaryLanguage]}`
          }
          onChange={(event) =>
            onSecondaryChange(
              event.target.value as PresentationSecondaryLanguage,
            )
          }
          className="rtt-select h-10 w-24 px-2 text-center text-base font-semibold"
        >
          <option value="none">없음(无)</option>
          {SUPPORTED_LANGUAGES.map((language) => (
            <option
              key={language}
              value={language}
              aria-label={LANGUAGE_SELECT_LABELS[language]}
            >
              {LANGUAGE_FLAG_LABELS[language]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

async function recordSessionUsage(
  sessionIds: string[],
  eventType: "session_started" | "session_stopped",
) {
  await Promise.all(
    uniqueSessionIds(sessionIds).map((currentSessionId) =>
      recordUsageEvent({
        sessionId: currentSessionId,
        eventType,
        mode: "presentation",
        timestamp: new Date().toISOString(),
      }),
    ),
  );
}

function getPresentationOutputLanguages(
  primaryLanguage: SupportedLanguage,
  secondaryLanguage: PresentationSecondaryLanguage,
): SupportedLanguage[] {
  return secondaryLanguage === "none"
    ? [primaryLanguage]
    : [primaryLanguage, secondaryLanguage];
}

function readPresentationSession(
  sessions: RealtimeSessionCredential[],
  language: SupportedLanguage,
  index: number,
): RealtimeSessionCredential {
  if (sessions.length <= index) {
    throw new Error("OpenAI presentation sessions were not returned.");
  }

  const indexedSession = sessions[index];
  const matchingSessions = sessions.filter(
    (realtimeSession) => realtimeSession.targetLanguage === language,
  );
  const matchingSession =
    matchingSessions[index > 0 && matchingSessions.length > 1 ? 1 : 0];
  const session =
    indexedSession.targetLanguage === language
      ? indexedSession
      : matchingSession ?? indexedSession;

  if (!session) {
    throw new Error("OpenAI presentation sessions were not returned.");
  }

  return session;
}

function derivePresentationStatus(
  statuses: PresentationSessionStatuses,
): RealtimeConnectionStatus {
  const values = Object.values(statuses);

  if (values.includes("error")) {
    return "error";
  }

  if (values.includes("reconnecting")) {
    return "reconnecting";
  }

  if (values.includes("translating")) {
    return "translating";
  }

  if (values.includes("connecting")) {
    return "connecting";
  }

  if (values.includes("listening")) {
    return "listening";
  }

  if (values.includes("idle")) {
    return "idle";
  }

  return "stopped";
}

function uniqueSessionIds(sessionIds: string[]): string[] {
  return [...new Set(sessionIds)];
}

type TimeoutRef = {
  current: number | null;
};

function clearTimeoutRef(timeoutRef: TimeoutRef) {
  if (timeoutRef.current === null) {
    return;
  }

  window.clearTimeout(timeoutRef.current);
  timeoutRef.current = null;
}

function createEmptySourceCaptionState(): PresentationSourceCaptionState {
  return {
    detectedLanguage: "unknown",
    text: "",
    isFinal: false,
  };
}

function createEmptyTranslatedCaptionState(): Record<
  PresentationSessionRole,
  PresentationRoleCaptionState
> {
  return {
    primary: {
      text: "",
      isFinal: false,
    },
    secondary: {
      text: "",
      isFinal: false,
    },
  };
}

function appendPresentationTranscriptText(
  currentText: string,
  delta: string,
  language: DetectedSupportedLanguage,
): string {
  const normalizedDelta = delta.replace(/\s+/g, " ");

  if (!currentText) {
    return normalizedDelta.trimStart();
  }

  if (
    /\s$/u.test(currentText) ||
    /^\s/u.test(normalizedDelta) ||
    /^[,.;:!?，。！？；：%)]/u.test(normalizedDelta)
  ) {
    return `${currentText}${normalizedDelta}`.replace(/\s+/g, " ");
  }

  if (
    language !== "zh" &&
    shouldSeparateTranscriptFragments(currentText, normalizedDelta)
  ) {
    return `${currentText} ${normalizedDelta}`.replace(/\s+/g, " ");
  }

  return `${currentText}${normalizedDelta}`.replace(/\s+/g, " ");
}

function shouldSeparateTranscriptFragments(
  currentText: string,
  delta: string,
): boolean {
  const previousCharacter = Array.from(currentText.trimEnd()).at(-1);
  const nextCharacter = Array.from(delta.trimStart()).at(0);

  return Boolean(
    previousCharacter &&
      nextCharacter &&
      /[A-Za-z0-9가-힣]/u.test(previousCharacter) &&
      /[A-Za-z0-9가-힣]/u.test(nextCharacter),
  );
}

function createPresentationCaption(
  text: string,
  language: SupportedLanguage,
  sessionId: string,
  isFinal = false,
  secondaryOutput?: PresentationCaptionEvent["secondaryOutput"],
  detectedLanguage?: DetectedSupportedLanguage,
): PresentationCaptionEvent {
  return {
    type: isFinal ? "caption_final" : "caption_delta",
    mode: "presentation",
    sessionId,
    detectedLanguage,
    output: {
      language,
      text: normalizeCaptionText(text, language),
    },
    secondaryOutput: secondaryOutput
      ? {
          language: secondaryOutput.language,
          text: normalizeCaptionText(
            secondaryOutput.text,
            secondaryOutput.language,
          ),
        }
      : undefined,
    isFinal,
    timestamp: new Date().toISOString(),
  };
}
