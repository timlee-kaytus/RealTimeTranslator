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
  ConversationCaptionEvent,
  RealtimeConnectionStatus,
  RealtimeSessionCredential,
} from "@/lib/types/realtime";

const initialTopLanguage: SupportedLanguage = "zh";
const initialBottomLanguage: SupportedLanguage = "ko";

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
  const [status, setStatus] = useState<RealtimeConnectionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionId, setSessionId] = useState("mock-session");
  const [caption, setCaption] = useState<ConversationCaptionEvent>(() =>
    createMockConversationEvent(0, initialTopLanguage, initialBottomLanguage),
  );
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

  const active = status === "listening" || status === "translating";
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

  useEffect(() => {
    const captionBuffers = captionBuffersRef.current;

    return () => {
      Object.values(realtimeConnectionsRef.current).forEach((connection) => {
        connection?.close();
      });
      realtimeConnectionsRef.current = {};
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      Object.values(captionIdleCommitTimeoutsRef.current).forEach(
        (timeoutId) => window.clearTimeout(timeoutId),
      );
      captionIdleCommitTimeoutsRef.current = {};
      captionBuffers.top.clear();
      captionBuffers.bottom.clear();
    };
  }, []);

  useEffect(() => {
    if (!active || !shouldUseMockRealtime()) {
      return;
    }

    let index = 0;

    const emitMockCaption = () => {
      setStatus(index % 2 === 0 ? "listening" : "translating");
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
        return;
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
      setErrorMessage(getRealtimeUserMessage(error));
    }
  }

  async function stopSession() {
    const sessionIds = activeSessionIdsRef.current;

    setStatus("stopped");
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
      onStatusChange: (nextStatus) => {
        handleSessionStatusChange(role, nextStatus);
      },
      onTranscriptDelta: (delta) => {
        const displayState = captionBuffersRef.current[role].appendDelta(delta);

        updateConversationCaption(
          role,
          displayState.currentBlock.text,
          displayState.currentBlock.isFinal,
        );
        scheduleCaptionIdleCommit(role);
      },
      onTranscriptFinal: (text) => {
        if (!text) {
          return;
        }

        clearCaptionIdleCommit(role);
        const displayState =
          captionBuffersRef.current[role].replaceWithFinalText(text);

        updateConversationCaption(role, displayState.currentBlock.text, true);
      },
      onError: (message) => {
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
    setStatus(deriveConversationStatus(sessionStatusesRef.current));
  }

  function updateConversationCaption(
    role: ConversationSessionRole,
    text: string,
    isFinal = false,
  ) {
    setCaption((current) =>
      createConversationCaption({
        sessionId: current.sessionId,
        topLanguage: current.top.language,
        bottomLanguage: current.bottom.language,
        topText: role === "top" ? text : current.top.text,
        bottomText: role === "bottom" ? text : current.bottom.text,
        isFinal,
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
    clearAllCaptionIdleCommits();
    sessionStatusesRef.current = {
      top: "stopped",
      bottom: "stopped",
    };
  }

  function handleTopLanguageChange(language: SupportedLanguage) {
    setTopLanguage(language);

    if (!active) {
      resetCaptionBuffers(language, bottomLanguage);
      setCaptionFromMock(0, language, bottomLanguage, sessionId);
    }
  }

  function handleBottomLanguageChange(language: SupportedLanguage) {
    setBottomLanguage(language);

    if (!active) {
      resetCaptionBuffers(topLanguage, language);
      setCaptionFromMock(0, topLanguage, language, sessionId);
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

  function resetCaptionBuffers(
    nextTopLanguage: SupportedLanguage,
    nextBottomLanguage: SupportedLanguage,
  ) {
    clearAllCaptionIdleCommits();
    captionBuffersRef.current.top.setLanguage(nextTopLanguage);
    captionBuffersRef.current.bottom.setLanguage(nextBottomLanguage);
  }

  function setCaptionFromMock(
    index: number,
    nextTopLanguage: SupportedLanguage,
    nextBottomLanguage: SupportedLanguage,
    currentSessionId: string,
  ) {
    const mockCaption = createMockConversationEvent(
      index,
      nextTopLanguage,
      nextBottomLanguage,
      currentSessionId,
    );
    const topDisplayState =
      captionBuffersRef.current.top.replaceWithFinalText(mockCaption.top.text);
    const bottomDisplayState =
      captionBuffersRef.current.bottom.replaceWithFinalText(
        mockCaption.bottom.text,
      );

    setCaption(
      createConversationCaption({
        sessionId: currentSessionId,
        topLanguage: nextTopLanguage,
        bottomLanguage: nextBottomLanguage,
        topText: topDisplayState.currentBlock.text,
        bottomText: bottomDisplayState.currentBlock.text,
        isFinal: true,
      }),
    );
  }

  return (
    <section className="grid min-h-[calc(100dvh-76px)] grid-rows-[1fr_auto_1fr] gap-3 p-3 md:p-4">
      <OpponentSubtitlePanel
        language={topLanguage}
        text={caption.top.text}
        fontSize={topCaptionFontSize}
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
};

function createConversationCaption({
  sessionId,
  topLanguage,
  bottomLanguage,
  topText,
  bottomText,
  isFinal = false,
}: ConversationCaptionOptions): ConversationCaptionEvent {
  return {
    type: isFinal ? "caption_final" : "caption_delta",
    mode: "conversation",
    sessionId,
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
