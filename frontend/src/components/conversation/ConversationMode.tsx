"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { MicToggleButton } from "@/components/MicToggleButton";
import { MicLevelMeter } from "@/components/conversation/MicLevelMeter";
import { OpponentSubtitlePanel } from "@/components/conversation/OpponentSubtitlePanel";
import { PushToTalkButton } from "@/components/conversation/PushToTalkButton";
import { UserSubtitlePanel } from "@/components/conversation/UserSubtitlePanel";
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
  requestMicrophoneAccess,
  type RealtimeTranslationConnection,
} from "@/lib/api/realtimeClient";
import { createUiSessionId } from "@/lib/browser/sessionId";
import { CaptionBuffer } from "@/lib/caption/captionBuffer";
import {
  CAPTION_IDLE_COMMIT_MS,
  getCaptionDisplayFontSize,
} from "@/lib/caption/captionDisplayPolicy";
import { createMockConversationEvent } from "@/lib/mock/mockRealtimeEvents";
import type { SupportedLanguage } from "@/lib/types/language";
import type {
  ConversationActivityStatus,
  ConversationCaptionEvent,
  RealtimeConnectionStatus,
  RealtimeSessionCredential,
} from "@/lib/types/realtime";

const initialTopLanguage: SupportedLanguage = "zh";
const initialBottomLanguage: SupportedLanguage = "ko";
const WARMUP_MS = 1000;
const READY_VISIBLE_MS = 800;
const MOCK_FIRST_CAPTION_DELAY_MS = WARMUP_MS + READY_VISIBLE_MS + 200;
const SPEECH_DETECTED_HOLD_MS = 200;
const TRANSLATING_IDLE_RESET_MS = 1200;
const SOURCE_TRANSCRIPT_SESSION_ROLE: ConversationSessionRole = "top";

type ConversationSessionRole = "top" | "bottom";
type ConversationSessionStatuses = Record<
  ConversationSessionRole,
  RealtimeConnectionStatus
>;

export function ConversationMode() {
  const [topLanguage, setTopLanguage] =
    useState<SupportedLanguage>(initialTopLanguage);
  const [bottomLanguage, setBottomLanguage] =
    useState<SupportedLanguage>(initialBottomLanguage);
  const [status, setStatus] = useState<RealtimeConnectionStatus>("stopped");
  const [activityStatus, setActivityStatus] =
    useState<ConversationActivityStatus>("stopped");
  const [pushToTalkActive, setPushToTalkActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionId, setSessionId] = useState("mock-session");
  const [caption, setCaption] = useState<ConversationCaptionEvent>(() =>
    createConversationCaption({
      sessionId: "mock-session",
      topLanguage: initialTopLanguage,
      bottomLanguage: initialBottomLanguage,
      topText: "",
      bottomText: "",
    }),
  );
  const {
    level: micLevel,
    speaking: isSpeaking,
    start: startMicrophoneLevel,
    stop: stopMicrophoneLevel,
  } = useMicrophoneLevel();
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const realtimeConnectionsRef = useRef<
    Partial<Record<ConversationSessionRole, RealtimeTranslationConnection>>
  >({});
  const captionBuffersRef = useRef<Record<ConversationSessionRole, CaptionBuffer>>({
    top: new CaptionBuffer({
      mode: "conversation",
      language: initialTopLanguage,
    }),
    bottom: new CaptionBuffer({
      mode: "conversation",
      language: initialBottomLanguage,
    }),
  });
  const captionIdleCommitTimeoutsRef = useRef<
    Partial<Record<ConversationSessionRole, number>>
  >({});
  const sessionStatusesRef = useRef<ConversationSessionStatuses>(
    createInitialSessionStatuses(),
  );
  const activeSessionIdsRef = useRef<string[]>([]);
  const warmupTimeoutRef = useRef<number | null>(null);
  const readyTimeoutRef = useRef<number | null>(null);
  const speechDetectedTimeoutRef = useRef<number | null>(null);
  const translatingResetTimeoutRef = useRef<number | null>(null);
  const sourceTranscriptResetTimeoutRef = useRef<number | null>(null);
  const sourceTranscriptLanguageRef = useRef<SupportedLanguage | null>(null);
  const sourceTranscriptRolesRef = useRef<ConversationSessionRole[]>([]);
  const sourceTranscriptTextRef = useRef("");
  const pushToTalkActiveRef = useRef(false);
  const pushToTalkStartingRef = useRef(false);

  const active =
    isActiveConnectionStatus(status) || isActiveActivityStatus(activityStatus);
  const busy = status === "connecting" || status === "reconnecting";
  const topCaptionFontSize = getCaptionDisplayFontSize({
    mode: "conversation",
    language: topLanguage,
    text: caption.top.text,
  });
  const bottomCaptionFontSize = getCaptionDisplayFontSize({
    mode: "conversation",
    language: bottomLanguage,
    text: caption.bottom.text,
  });

  const clearConversationActivityTimers = useCallback(() => {
    clearTimeoutRef(warmupTimeoutRef);
    clearTimeoutRef(readyTimeoutRef);
    clearTimeoutRef(speechDetectedTimeoutRef);
    clearTimeoutRef(translatingResetTimeoutRef);
    clearTimeoutRef(sourceTranscriptResetTimeoutRef);
  }, []);

  const startActivityWarmup = useCallback(() => {
    clearConversationActivityTimers();
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
  }, [clearConversationActivityTimers]);

  const markActivityTranslating = useCallback(() => {
    clearTimeoutRef(readyTimeoutRef);
    clearTimeoutRef(speechDetectedTimeoutRef);
    clearTimeoutRef(translatingResetTimeoutRef);
    setActivityStatus("translating");

    translatingResetTimeoutRef.current = window.setTimeout(() => {
      translatingResetTimeoutRef.current = null;
      setActivityStatus((currentStatus) =>
        currentStatus === "translating" ? "listening" : currentStatus,
      );
    }, TRANSLATING_IDLE_RESET_MS);
  }, []);

  const returnActivityToListening = useCallback(() => {
    clearTimeoutRef(translatingResetTimeoutRef);
    setActivityStatus((currentStatus) =>
      currentStatus === "translating" ||
      currentStatus === "speech_detected" ||
      currentStatus === "ready"
        ? "listening"
        : currentStatus,
    );
  }, []);

  const syncActivityWithConnectionStatus = useCallback(
    (nextStatus: RealtimeConnectionStatus) => {
      if (
        nextStatus === "connecting" ||
        nextStatus === "reconnecting" ||
        nextStatus === "error" ||
        nextStatus === "stopped"
      ) {
        clearConversationActivityTimers();
        setActivityStatus(nextStatus);
        return;
      }

      if (nextStatus === "listening") {
        setActivityStatus((currentStatus) =>
          currentStatus === "reconnecting" ? "listening" : currentStatus,
        );
      }
    },
    [clearConversationActivityTimers],
  );

  useEffect(() => {
    const captionBuffers = captionBuffersRef.current;

    return () => {
      clearConversationActivityTimers();
      Object.values(realtimeConnectionsRef.current).forEach((connection) => {
        connection?.close();
      });
      realtimeConnectionsRef.current = {};
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      stopMicrophoneLevel();
      Object.values(captionIdleCommitTimeoutsRef.current).forEach(
        (timeoutId) => window.clearTimeout(timeoutId),
      );
      captionIdleCommitTimeoutsRef.current = {};
      resetSourceTranscriptState();
      captionBuffers.top.clear();
      captionBuffers.bottom.clear();
    };
  }, [clearConversationActivityTimers, stopMicrophoneLevel]);

  useEffect(() => {
    if (!canUpdateSpeechActivity(status, activityStatus)) {
      clearTimeoutRef(speechDetectedTimeoutRef);
      return;
    }

    if (!isSpeaking) {
      clearTimeoutRef(speechDetectedTimeoutRef);

      if (activityStatus !== "speech_detected") {
        return;
      }

      speechDetectedTimeoutRef.current = window.setTimeout(() => {
        speechDetectedTimeoutRef.current = null;
        setActivityStatus((currentStatus) =>
          currentStatus === "speech_detected" ? "listening" : currentStatus,
        );
      }, 0);
      return;
    }

    if (
      activityStatus === "speech_detected" ||
      speechDetectedTimeoutRef.current !== null
    ) {
      return;
    }

    speechDetectedTimeoutRef.current = window.setTimeout(() => {
      speechDetectedTimeoutRef.current = null;
      setActivityStatus((currentStatus) =>
        canShowSpeechDetected(currentStatus)
          ? "speech_detected"
          : currentStatus,
      );
    }, SPEECH_DETECTED_HOLD_MS);
  }, [activityStatus, isSpeaking, status]);

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

      const mockCaption = createMockConversationEvent(
        index,
        topLanguage,
        bottomLanguage,
        sessionId,
      );
      const topDisplayState = captionBuffersRef.current.top.appendDelta(
        mockCaption.top.text,
      );
      const bottomDisplayState = captionBuffersRef.current.bottom.appendDelta(
        mockCaption.bottom.text,
      );
      const finalTopDisplayState =
        captionBuffersRef.current.top.commitCurrentBlock();
      const finalBottomDisplayState =
        captionBuffersRef.current.bottom.commitCurrentBlock();

      setCaption(
        createConversationCaption({
          sessionId,
          topLanguage,
          bottomLanguage,
          topText:
            finalTopDisplayState.currentBlock.text ||
            topDisplayState.currentBlock.text,
          bottomText:
            finalBottomDisplayState.currentBlock.text ||
            bottomDisplayState.currentBlock.text,
          isFinal: true,
        }),
      );
      index += 1;
    };

    const firstTimeoutId = window.setTimeout(
      emitMockCaption,
      MOCK_FIRST_CAPTION_DELAY_MS,
    );
    const intervalId = window.setInterval(emitMockCaption, 2200);

    return () => {
      window.clearTimeout(firstTimeoutId);
      window.clearInterval(intervalId);
    };
  }, [active, bottomLanguage, markActivityTranslating, sessionId, topLanguage]);

  async function handleToggle() {
    if (pushToTalkActiveRef.current) {
      return;
    }

    if (active || busy) {
      await stopSession();
      return;
    }

    await startSession();
  }

  async function handlePushToTalkStart() {
    if (pushToTalkActiveRef.current || pushToTalkStartingRef.current) {
      return;
    }

    if (status === "reconnecting") {
      return;
    }

    pushToTalkActiveRef.current = true;
    pushToTalkStartingRef.current = true;
    setPushToTalkActive(true);

    try {
      if (active || busy) {
        await stopSession();
      }

      if (!pushToTalkActiveRef.current) {
        return;
      }

      const started = await startSession();

      if (!pushToTalkActiveRef.current && started) {
        await stopSession();
      }
    } finally {
      pushToTalkStartingRef.current = false;

      if (!pushToTalkActiveRef.current) {
        setPushToTalkActive(false);
      }
    }
  }

  async function handlePushToTalkEnd() {
    if (!pushToTalkActiveRef.current) {
      return;
    }

    pushToTalkActiveRef.current = false;
    setPushToTalkActive(false);

    if (pushToTalkStartingRef.current) {
      return;
    }

    if (active || busy) {
      await stopSession();
    }
  }

  async function startSession(): Promise<boolean> {
    setStatus("connecting");
    setActivityStatus("connecting");
    setErrorMessage("");
    clearConversationActivityTimers();
    stopMicrophoneLevel();
    resetRealtimeState("connecting");

    try {
      const uiSessionId = createUiSessionId();
      const usingMockRealtime = shouldUseMockRealtime();
      const mediaStream = usingMockRealtime
        ? null
        : await requestMicrophoneAccess();

      if (!usingMockRealtime && !mediaStream) {
        throw new Error("마이크 권한을 확인하지 못했습니다.");
      }

      if (mediaStream) {
        mediaStreamRef.current = mediaStream;
        startMicrophoneLevel(mediaStream);
      }

      const session = await createRealtimeSession({
        mode: "conversation",
        targetLanguages: [topLanguage, bottomLanguage],
        clientId: "anonymous",
        uiSessionId,
      });

      setSessionId(session.sessionId);
      activeSessionIdsRef.current = session.sessions.map(
        (realtimeSession) => realtimeSession.sessionId,
      );
      setCaption(
        createConversationCaption({
          sessionId: session.sessionId,
          topLanguage,
          bottomLanguage,
          topText: "",
          bottomText: "",
        }),
      );

      if (usingMockRealtime) {
        await recordSessionUsage(activeSessionIdsRef.current, "session_started");
        setStatus("listening");
        startActivityWarmup();
        return true;
      }

      if (!mediaStream) {
        throw new Error("마이크 권한을 확인하지 못했습니다.");
      }

      const topSession = readConversationSession(
        session.sessions,
        topLanguage,
        0,
      );
      const bottomSession = readConversationSession(
        session.sessions,
        bottomLanguage,
        1,
      );
      activeSessionIdsRef.current = uniqueSessionIds([
        topSession.sessionId,
        bottomSession.sessionId,
      ]);

      const connectionResults = await Promise.allSettled([
        connectConversationSession("top", topSession, mediaStream),
        connectConversationSession("bottom", bottomSession, mediaStream),
      ]);
      const failedConnection = connectionResults.find(
        (result) => result.status === "rejected",
      );

      if (failedConnection?.status === "rejected") {
        throw failedConnection.reason;
      }

      await recordSessionUsage(activeSessionIdsRef.current, "session_started");
      setStatus("listening");
      startActivityWarmup();
      return true;
    } catch (error) {
      const sessionIds = activeSessionIdsRef.current;

      cleanupRealtimeConnections();
      await Promise.allSettled(
        sessionIds.map((currentSessionId) =>
          endRealtimeSession({
            sessionId: currentSessionId,
            reason: "error",
          }),
        ),
      );
      activeSessionIdsRef.current = [];
      resetCaptionBuffers(topLanguage, bottomLanguage);
      setStatus("error");
      setActivityStatus("error");
      setErrorMessage(getRealtimeUserMessage(error));
      return false;
    }
  }

  async function stopSession() {
    const sessionIds = activeSessionIdsRef.current;

    setStatus("stopped");
    setActivityStatus("stopped");
    clearConversationActivityTimers();
    cleanupRealtimeConnections();
    resetCaptionBuffers(topLanguage, bottomLanguage);
    setCaption(
      createConversationCaption({
        sessionId,
        topLanguage,
        bottomLanguage,
        topText: "",
        bottomText: "",
      }),
    );
    setErrorMessage("");

    try {
      await Promise.all(
        sessionIds.map((currentSessionId) =>
          endRealtimeSession({
            sessionId: currentSessionId,
            reason: "user_stop",
          }),
        ),
      );
      await recordSessionUsage(sessionIds, "session_stopped");
    } catch {
      setStatus("error");
      setActivityStatus("error");
      setErrorMessage(getRealtimeUserMessage("network"));
    }
  }

  function resetRealtimeState(nextStatus: RealtimeConnectionStatus) {
    resetCaptionBuffers(topLanguage, bottomLanguage);
    sessionStatusesRef.current = {
      top: nextStatus,
      bottom: nextStatus,
    };
    activeSessionIdsRef.current = [];
  }

  async function connectConversationSession(
    role: ConversationSessionRole,
    realtimeSession: RealtimeSessionCredential,
    mediaStream: MediaStream,
  ): Promise<RealtimeTranslationConnection> {
    handleSessionStatusChange(role, "connecting");

    const connection = await connectOpenAIRealtimeTranslation({
      sourceStream: mediaStream,
      clientSecret: realtimeSession.clientSecret,
      stopSourceTracksOnClose: false,
      enableInputTranscription: role === SOURCE_TRANSCRIPT_SESSION_ROLE,
      onStatusChange: (nextStatus) => {
        handleSessionStatusChange(role, nextStatus);
      },
      onInputTranscriptDelta:
        role === SOURCE_TRANSCRIPT_SESSION_ROLE
          ? handleInputTranscriptDelta
          : undefined,
      onInputTranscriptFinal:
        role === SOURCE_TRANSCRIPT_SESSION_ROLE
          ? handleInputTranscriptFinal
          : undefined,
      onTranscriptDelta: (delta) => {
        if (shouldIgnoreOutputTranscript(role)) {
          return;
        }

        markActivityTranslating();
        const displayState = captionBuffersRef.current[role].appendDelta(delta);

        updateConversationCaption(
          role,
          displayState.currentBlock.text,
          displayState.currentBlock.isFinal,
        );
        scheduleCaptionIdleCommit(role);
      },
      onTranscriptFinal: (text) => {
        returnActivityToListening();

        if (shouldIgnoreOutputTranscript(role)) {
          return;
        }

        if (!text) {
          return;
        }

        clearCaptionIdleCommit(role);
        const displayState =
          captionBuffersRef.current[role].replaceWithFinalText(text);

        updateConversationCaption(role, displayState.currentBlock.text, true);
      },
      onError: (message) => {
        clearConversationActivityTimers();
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

  function handleSessionStatusChange(
    role: ConversationSessionRole,
    nextStatus: RealtimeConnectionStatus,
  ) {
    sessionStatusesRef.current = {
      ...sessionStatusesRef.current,
      [role]: nextStatus,
    };
    const derivedStatus = deriveConversationStatus(sessionStatusesRef.current);
    setStatus(derivedStatus);
    syncActivityWithConnectionStatus(derivedStatus);
  }

  function updateConversationCaption(
    role: ConversationSessionRole,
    text: string,
    isFinal = false,
    detectedLanguage?: SupportedLanguage | "unknown",
  ) {
    setCaption((current) =>
      createConversationCaption({
        sessionId: current.sessionId,
        topLanguage: current.top.language,
        bottomLanguage: current.bottom.language,
        topText: role === "top" ? text : current.top.text,
        bottomText: role === "bottom" ? text : current.bottom.text,
        isFinal,
        detectedLanguage: detectedLanguage ?? current.detectedLanguage,
      }),
    );
  }

  function cleanupRealtimeConnections() {
    Object.values(realtimeConnectionsRef.current).forEach((connection) => {
      connection?.close();
    });
    realtimeConnectionsRef.current = {};
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    stopMicrophoneLevel();
    clearConversationActivityTimers();
    clearAllCaptionIdleCommits();
    sessionStatusesRef.current = {
      top: "stopped",
      bottom: "stopped",
    };
    resetSourceTranscriptState();
  }

  function handleTopLanguageChange(language: SupportedLanguage) {
    setTopLanguage(language);

    if (!active) {
      resetCaptionBuffers(language, bottomLanguage);
      setCaption(
        createConversationCaption({
          sessionId,
          topLanguage: language,
          bottomLanguage,
          topText: "",
          bottomText: "",
        }),
      );
    }
  }

  function handleBottomLanguageChange(language: SupportedLanguage) {
    setBottomLanguage(language);

    if (!active) {
      resetCaptionBuffers(topLanguage, language);
      setCaption(
        createConversationCaption({
          sessionId,
          topLanguage,
          bottomLanguage: language,
          topText: "",
          bottomText: "",
        }),
      );
    }
  }

  function scheduleCaptionIdleCommit(role: ConversationSessionRole) {
    clearCaptionIdleCommit(role);
    captionIdleCommitTimeoutsRef.current[role] = window.setTimeout(() => {
      const displayState = captionBuffersRef.current[role].commitCurrentBlock();

      updateConversationCaption(role, displayState.currentBlock.text, true);
    }, CAPTION_IDLE_COMMIT_MS);
  }

  function clearCaptionIdleCommit(role: ConversationSessionRole) {
    const timeoutId = captionIdleCommitTimeoutsRef.current[role];

    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      delete captionIdleCommitTimeoutsRef.current[role];
    }
  }

  function clearAllCaptionIdleCommits() {
    clearCaptionIdleCommit("top");
    clearCaptionIdleCommit("bottom");
  }

  function handleInputTranscriptDelta(delta: string) {
    const nextText = `${sourceTranscriptTextRef.current}${delta}`;
    sourceTranscriptTextRef.current = nextText;

    const detectedLanguage =
      sourceTranscriptLanguageRef.current ??
      detectSupportedLanguageFromText(nextText);

    if (!detectedLanguage) {
      scheduleSourceTranscriptReset();
      return;
    }

    sourceTranscriptLanguageRef.current = detectedLanguage;
    const sourceRoles = getConversationRolesForLanguage(detectedLanguage);
    sourceTranscriptRolesRef.current = sourceRoles;

    if (sourceRoles.length === 0) {
      scheduleSourceTranscriptReset();
      return;
    }

    markActivityTranslating();
    sourceRoles.forEach((role) => {
      const displayState =
        captionBuffersRef.current[role].replaceCurrentText(nextText);

      updateConversationCaption(
        role,
        displayState.currentBlock.text,
        displayState.currentBlock.isFinal,
        detectedLanguage,
      );
    });
    scheduleSourceTranscriptReset();
  }

  function handleInputTranscriptFinal(text: string) {
    const finalText = text || sourceTranscriptTextRef.current;

    if (!finalText) {
      return;
    }

    const detectedLanguage =
      sourceTranscriptLanguageRef.current ??
      detectSupportedLanguageFromText(finalText);

    if (!detectedLanguage) {
      return;
    }

    sourceTranscriptLanguageRef.current = detectedLanguage;
    const sourceRoles = getConversationRolesForLanguage(detectedLanguage);
    sourceTranscriptRolesRef.current = sourceRoles;

    sourceRoles.forEach((role) => {
      clearCaptionIdleCommit(role);
      const displayState =
        captionBuffersRef.current[role].replaceWithFinalText(finalText);

      updateConversationCaption(
        role,
        displayState.currentBlock.text,
        true,
        detectedLanguage,
      );
    });
    resetSourceTranscriptState();
  }

  function shouldIgnoreOutputTranscript(role: ConversationSessionRole): boolean {
    return sourceTranscriptRolesRef.current.includes(role);
  }

  function getConversationRolesForLanguage(
    language: SupportedLanguage,
  ): ConversationSessionRole[] {
    const roles: ConversationSessionRole[] = [];

    if (topLanguage === language) {
      roles.push("top");
    }

    if (bottomLanguage === language) {
      roles.push("bottom");
    }

    return roles;
  }

  function scheduleSourceTranscriptReset() {
    clearTimeoutRef(sourceTranscriptResetTimeoutRef);
    sourceTranscriptResetTimeoutRef.current = window.setTimeout(() => {
      const sourceRoles = sourceTranscriptRolesRef.current;

      sourceRoles.forEach((role) => {
        const displayState = captionBuffersRef.current[role].commitCurrentBlock();

        updateConversationCaption(role, displayState.currentBlock.text, true);
      });
      resetSourceTranscriptState();
      returnActivityToListening();
    }, CAPTION_IDLE_COMMIT_MS);
  }

  function resetSourceTranscriptState() {
    clearTimeoutRef(sourceTranscriptResetTimeoutRef);
    sourceTranscriptLanguageRef.current = null;
    sourceTranscriptRolesRef.current = [];
    sourceTranscriptTextRef.current = "";
  }

  function resetCaptionBuffers(
    nextTopLanguage: SupportedLanguage,
    nextBottomLanguage: SupportedLanguage,
  ) {
    clearAllCaptionIdleCommits();
    resetSourceTranscriptState();
    captionBuffersRef.current.top.setLanguage(nextTopLanguage);
    captionBuffersRef.current.bottom.setLanguage(nextBottomLanguage);
  }

  return (
    <section className="grid h-[calc(100dvh-76px)] grid-rows-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 overflow-hidden p-3 md:p-4">
      <OpponentSubtitlePanel
        language={topLanguage}
        text={caption.top.text}
        fontSize={topCaptionFontSize}
        onLanguageChange={handleTopLanguageChange}
      />

      <div className="flex flex-wrap items-center justify-center gap-3 rounded-[8px] border border-zinc-200 bg-white px-3 py-3 shadow-sm">
        <MicLevelMeter
          disabled={!active && !busy}
          level={micLevel}
          speaking={isSpeaking}
        />
        <MicToggleButton
          active={active || busy}
          compact
          disabled={status === "reconnecting" || pushToTalkActive}
          onClick={handleToggle}
        />
        <PushToTalkButton
          active={pushToTalkActive}
          disabled={status === "reconnecting"}
          onPressEnd={handlePushToTalkEnd}
          onPressStart={handlePushToTalkStart}
        />
        <ErrorBanner message={errorMessage} />
      </div>

      <UserSubtitlePanel
        language={bottomLanguage}
        text={caption.bottom.text}
        fontSize={bottomCaptionFontSize}
        onLanguageChange={handleBottomLanguageChange}
      />
    </section>
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
        mode: "conversation",
        timestamp: new Date().toISOString(),
      }),
    ),
  );
}

function createInitialSessionStatuses(): ConversationSessionStatuses {
  return {
    top: "idle",
    bottom: "idle",
  };
}

function deriveConversationStatus(
  statuses: ConversationSessionStatuses,
): RealtimeConnectionStatus {
  if (statuses.top === "error" || statuses.bottom === "error") {
    return "error";
  }

  if (
    statuses.top === "reconnecting" ||
    statuses.bottom === "reconnecting"
  ) {
    return "reconnecting";
  }

  if (statuses.top === "translating" || statuses.bottom === "translating") {
    return "translating";
  }

  if (statuses.top === "connecting" || statuses.bottom === "connecting") {
    return "connecting";
  }

  if (statuses.top === "listening" || statuses.bottom === "listening") {
    return "listening";
  }

  if (statuses.top === "idle" && statuses.bottom === "idle") {
    return "idle";
  }

  return "stopped";
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

function isActiveConnectionStatus(status: RealtimeConnectionStatus): boolean {
  return status === "listening" || status === "translating";
}

function isActiveActivityStatus(status: ConversationActivityStatus): boolean {
  return (
    status === "warming_up" ||
    status === "ready" ||
    status === "listening" ||
    status === "speech_detected" ||
    status === "translating"
  );
}

function canUpdateSpeechActivity(
  connectionStatus: RealtimeConnectionStatus,
  activityStatus: ConversationActivityStatus,
): boolean {
  return (
    connectionStatus === "listening" &&
    (activityStatus === "ready" ||
      activityStatus === "listening" ||
      activityStatus === "speech_detected")
  );
}

function canShowSpeechDetected(
  activityStatus: ConversationActivityStatus,
): boolean {
  return activityStatus === "ready" || activityStatus === "listening";
}

function detectSupportedLanguageFromText(
  text: string,
): SupportedLanguage | null {
  const sample = text.trim();

  if (!sample) {
    return null;
  }

  if (/[가-힣]/.test(sample)) {
    return "ko";
  }

  if (/[\u3400-\u9fff]/.test(sample)) {
    return "zh";
  }

  if (/[a-z]/i.test(sample)) {
    return "en";
  }

  return null;
}

function uniqueSessionIds(sessionIds: string[]): string[] {
  return [...new Set(sessionIds)];
}

function readConversationSession(
  sessions: RealtimeSessionCredential[],
  language: SupportedLanguage,
  index: number,
): RealtimeSessionCredential {
  if (sessions.length <= index) {
    throw new Error("OpenAI conversation sessions were not returned.");
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
    throw new Error("OpenAI conversation sessions were not returned.");
  }

  return session;
}

type ConversationCaptionOptions = {
  sessionId: string;
  topLanguage: SupportedLanguage;
  bottomLanguage: SupportedLanguage;
  topText: string;
  bottomText: string;
  isFinal?: boolean;
  detectedLanguage?: SupportedLanguage | "unknown";
};

function createConversationCaption({
  sessionId,
  topLanguage,
  bottomLanguage,
  topText,
  bottomText,
  isFinal = false,
  detectedLanguage,
}: ConversationCaptionOptions): ConversationCaptionEvent {
  return {
    type: isFinal ? "caption_final" : "caption_delta",
    mode: "conversation",
    sessionId,
    detectedLanguage,
    top: {
      language: topLanguage,
      text: topText,
    },
    bottom: {
      language: bottomLanguage,
      text: bottomText,
    },
    isFinal,
    timestamp: new Date().toISOString(),
  };
}
