"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useMicrophoneLevel } from "@/hooks/useMicrophoneLevel";
import {
  createInterpreterSession,
  endRealtimeSession,
  recordUsageEvent,
  shouldUseMockRealtime,
} from "@/lib/api/backendClient";
import {
  connectOpenAIRealtimeVoice,
  getInterpreterConnectionMessage,
  type RealtimeVoiceConnection,
} from "@/lib/api/realtimeVoiceClient";
import { requestMicrophoneAccess } from "@/lib/api/realtimeClient";
import { createUiSessionId } from "@/lib/browser/sessionId";
import {
  INTERPRETER_MAX_DURATION_MESSAGE,
  INTERPRETER_MAX_DURATION_MS,
  INTERPRETER_RECONNECT_RETRY_MS,
  INTERPRETER_SESSION_RENEW_MS,
} from "@/lib/interpreter/sessionLifecycle";
import type {
  CreateInterpreterSessionResponse,
  InterpreterStatus,
  InterpreterVoiceEvent,
} from "@/lib/types/interpreter";

type StopReason = "user_stop" | "session_expired" | "error";

type UseRealtimeInterpreterResult = {
  status: InterpreterStatus;
  active: boolean;
  busy: boolean;
  muted: boolean;
  inputLevel: number;
  outputLevel: number;
  errorMessage: string;
  start: () => Promise<boolean>;
  stop: (reason?: StopReason) => Promise<void>;
  toggleMute: () => void;
};

export function useRealtimeInterpreter(): UseRealtimeInterpreterResult {
  const [status, setStatus] = useState<InterpreterStatus>("idle");
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [mockLevel, setMockLevel] = useState(0);
  const {
    level: measuredInputLevel,
    start: startInputMeter,
    stop: stopInputMeter,
  } = useMicrophoneLevel();
  const {
    level: measuredOutputLevel,
    start: startOutputMeter,
    stop: stopOutputMeter,
  } = useMicrophoneLevel();
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const connectionRef = useRef<RealtimeVoiceConnection | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const lifecycleEnabledRef = useRef(false);
  const mutedRef = useRef(false);
  const renewalInFlightRef = useRef(false);
  const operationIdRef = useRef(0);
  const renewTimeoutRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const maxDurationTimeoutRef = useRef<number | null>(null);
  const mockIntervalRef = useRef<number | null>(null);
  const renewSessionRef = useRef<() => Promise<void>>(async () => undefined);

  const setInterpreterStatus = useCallback((nextStatus: InterpreterStatus) => {
    if (mutedRef.current && isMuteOverridableStatus(nextStatus)) {
      setStatus("muted");
      return;
    }

    setStatus(nextStatus);
  }, []);

  const clearLifecycleTimers = useCallback(() => {
    clearTimeoutRef(renewTimeoutRef);
    clearTimeoutRef(reconnectTimeoutRef);
    clearTimeoutRef(maxDurationTimeoutRef);

    if (mockIntervalRef.current !== null) {
      window.clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }

    renewalInFlightRef.current = false;
    setMockLevel(0);
  }, []);

  const releaseMedia = useCallback(() => {
    connectionRef.current?.close();
    connectionRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    stopInputMeter();
    stopOutputMeter();
  }, [stopInputMeter, stopOutputMeter]);

  const scheduleReconnect = useCallback(() => {
    if (!lifecycleEnabledRef.current || shouldUseMockRealtime()) {
      return;
    }

    clearTimeoutRef(reconnectTimeoutRef);
    reconnectTimeoutRef.current = window.setTimeout(() => {
      reconnectTimeoutRef.current = null;
      void renewSessionRef.current();
    }, INTERPRETER_RECONNECT_RETRY_MS);
  }, []);

  const handleVoiceEvent = useCallback(
    (event: InterpreterVoiceEvent) => {
      if (!lifecycleEnabledRef.current) {
        return;
      }

      if (event === "connected") {
        clearTimeoutRef(reconnectTimeoutRef);
        setErrorMessage("");
        setInterpreterStatus("listening");
        return;
      }

      if (event === "speech_started") {
        setInterpreterStatus("user_speaking");
        return;
      }

      if (event === "speech_stopped" || event === "response_started") {
        setInterpreterStatus("interpreting");
        return;
      }

      if (event === "response_audio_started") {
        setInterpreterStatus("assistant_speaking");
        return;
      }

      if (event === "response_audio_done" || event === "response_done") {
        setInterpreterStatus("listening");
        return;
      }

      if (event === "disconnected" || event === "session_closed") {
        setInterpreterStatus("reconnecting");
        scheduleReconnect();
      }
    },
    [scheduleReconnect, setInterpreterStatus],
  );

  const connectSession = useCallback(
    async (
      session: CreateInterpreterSessionResponse,
      mediaStream: MediaStream,
    ): Promise<RealtimeVoiceConnection> => {
      return connectOpenAIRealtimeVoice({
        sourceStream: mediaStream,
        clientSecret: session.clientSecret,
        onVoiceEvent: handleVoiceEvent,
        onRemoteStream: (remoteStream) => {
          startOutputMeter(remoteStream);
        },
        onError: (message) => {
          if (!lifecycleEnabledRef.current) {
            return;
          }

          setErrorMessage(message);

          if (message.includes("자동 재생")) {
            return;
          }

          setInterpreterStatus("reconnecting");
          scheduleReconnect();
        },
      });
    },
    [handleVoiceEvent, scheduleReconnect, setInterpreterStatus, startOutputMeter],
  );

  const scheduleRenewal = useCallback(() => {
    if (shouldUseMockRealtime() || !lifecycleEnabledRef.current) {
      return;
    }

    clearTimeoutRef(renewTimeoutRef);
    renewTimeoutRef.current = window.setTimeout(() => {
      renewTimeoutRef.current = null;
      void renewSessionRef.current();
    }, INTERPRETER_SESSION_RENEW_MS);
  }, []);

  const renewSession = useCallback(async () => {
    if (
      !lifecycleEnabledRef.current ||
      renewalInFlightRef.current ||
      shouldUseMockRealtime()
    ) {
      return;
    }

    const mediaStream = mediaStreamRef.current;

    if (!mediaStream) {
      return;
    }

    renewalInFlightRef.current = true;
    clearTimeoutRef(renewTimeoutRef);
    clearTimeoutRef(reconnectTimeoutRef);
    setInterpreterStatus("reconnecting");

    const previousConnection = connectionRef.current;
    const previousSessionId = sessionIdRef.current;

    try {
      const session = await createInterpreterSession({
        clientId: "anonymous",
        uiSessionId: createUiSessionId(),
        languages: ["ko", "zh"],
        microphoneProfile: "far_field",
      });
      const nextConnection = await connectSession(session, mediaStream);

      if (!lifecycleEnabledRef.current) {
        nextConnection.close();
        return;
      }

      connectionRef.current = nextConnection;
      sessionIdRef.current = session.sessionId;
      nextConnection.setMuted(mutedRef.current);
      previousConnection?.close();
      setErrorMessage("");
      setInterpreterStatus("listening");
      scheduleRenewal();
      void recordInterpreterUsage(session.sessionId, "session_started");

      if (previousSessionId) {
        void endInterpreterSession(previousSessionId, "session_expired");
      }
    } catch (error) {
      if (!lifecycleEnabledRef.current) {
        return;
      }

      setErrorMessage(getInterpreterConnectionMessage(error));
      setInterpreterStatus("reconnecting");
      scheduleReconnect();
    } finally {
      renewalInFlightRef.current = false;
    }
  }, [connectSession, scheduleReconnect, scheduleRenewal, setInterpreterStatus]);

  useEffect(() => {
    renewSessionRef.current = renewSession;
  }, [renewSession]);

  const startMockActivity = useCallback(() => {
    const startedAt = Date.now();

    clearTimeoutRef(mockIntervalRef);
    mockIntervalRef.current = window.setInterval(() => {
      if (!lifecycleEnabledRef.current || mutedRef.current) {
        setMockLevel(0);
        return;
      }

      const elapsed = Date.now() - startedAt;
      const cycle = elapsed % 7600;
      const wave = Math.abs(Math.sin(elapsed / 210));

      if (cycle < 2500) {
        setInterpreterStatus("listening");
        setMockLevel(0.08 + wave * 0.08);
      } else if (cycle < 4300) {
        setInterpreterStatus("user_speaking");
        setMockLevel(0.28 + wave * 0.62);
      } else if (cycle < 5400) {
        setInterpreterStatus("interpreting");
        setMockLevel(0.12 + wave * 0.12);
      } else if (cycle < 7100) {
        setInterpreterStatus("assistant_speaking");
        setMockLevel(0.3 + wave * 0.58);
      } else {
        setInterpreterStatus("listening");
        setMockLevel(0.08);
      }
    }, 120);
  }, [setInterpreterStatus]);

  const stop = useCallback(
    async (reason: StopReason = "user_stop") => {
      operationIdRef.current += 1;
      lifecycleEnabledRef.current = false;
      const currentSessionId = sessionIdRef.current;

      setActive(false);
      setBusy(false);
      mutedRef.current = false;
      setMuted(false);
      clearLifecycleTimers();
      releaseMedia();
      sessionIdRef.current = null;
      setStatus(reason === "error" ? "error" : "stopped");

      if (reason === "user_stop") {
        setErrorMessage("");
      }

      if (currentSessionId) {
        await endInterpreterSession(currentSessionId, reason);
      }
    },
    [clearLifecycleTimers, releaseMedia],
  );

  const start = useCallback(async (): Promise<boolean> => {
    if (lifecycleEnabledRef.current || busy) {
      return false;
    }

    const operationId = operationIdRef.current + 1;
    operationIdRef.current = operationId;
    lifecycleEnabledRef.current = true;
    mutedRef.current = false;
    setMuted(false);
    setActive(false);
    setBusy(true);
    setErrorMessage("");
    clearLifecycleTimers();
    releaseMedia();

    let requestedStream: MediaStream | null = null;

    try {
      const usingMockRealtime = shouldUseMockRealtime();

      if (!usingMockRealtime) {
        setStatus("requesting_microphone");
        requestedStream = await requestMicrophoneAccess();

        if (!requestedStream) {
          throw new Error("마이크 권한을 확인하지 못했습니다.");
        }

        if (operationIdRef.current !== operationId) {
          requestedStream.getTracks().forEach((track) => track.stop());
          return false;
        }

        mediaStreamRef.current = requestedStream;
        startInputMeter(requestedStream);
      }

      setStatus("connecting");
      const session = await createInterpreterSession({
        clientId: "anonymous",
        uiSessionId: createUiSessionId(),
        languages: ["ko", "zh"],
        microphoneProfile: "far_field",
      });

      if (operationIdRef.current !== operationId) {
        requestedStream?.getTracks().forEach((track) => track.stop());
        return false;
      }

      sessionIdRef.current = session.sessionId;

      if (usingMockRealtime) {
        setActive(true);
        setBusy(false);
        setStatus("listening");
        startMockActivity();
        void recordInterpreterUsage(session.sessionId, "session_started");
        return true;
      }

      if (!requestedStream) {
        throw new Error("마이크 권한을 확인하지 못했습니다.");
      }

      const connection = await connectSession(session, requestedStream);

      if (operationIdRef.current !== operationId) {
        connection.close();
        return false;
      }

      connectionRef.current = connection;
      setActive(true);
      setBusy(false);
      setInterpreterStatus("listening");
      scheduleRenewal();
      maxDurationTimeoutRef.current = window.setTimeout(() => {
        setErrorMessage(INTERPRETER_MAX_DURATION_MESSAGE);
        void stop("session_expired");
      }, INTERPRETER_MAX_DURATION_MS);
      void recordInterpreterUsage(session.sessionId, "session_started");
      return true;
    } catch (error) {
      if (operationIdRef.current !== operationId) {
        return false;
      }

      lifecycleEnabledRef.current = false;
      clearLifecycleTimers();
      releaseMedia();
      const failedSessionId = sessionIdRef.current;
      sessionIdRef.current = null;
      setActive(false);
      setBusy(false);
      setStatus("error");
      setErrorMessage(getInterpreterConnectionMessage(error));

      if (failedSessionId) {
        void endInterpreterSession(failedSessionId, "error");
      }

      return false;
    }
  }, [
    busy,
    clearLifecycleTimers,
    connectSession,
    releaseMedia,
    scheduleRenewal,
    setInterpreterStatus,
    startInputMeter,
    startMockActivity,
    stop,
  ]);

  const toggleMute = useCallback(() => {
    if (!lifecycleEnabledRef.current || busy) {
      return;
    }

    const nextMuted = !mutedRef.current;
    mutedRef.current = nextMuted;
    setMuted(nextMuted);
    connectionRef.current?.setMuted(nextMuted);
    mediaStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });

    if (nextMuted) {
      setStatus("muted");
      return;
    }

    setStatus("listening");
    void connectionRef.current?.resumeAudio().catch(() => {
      setErrorMessage(
        "통역 음성 자동 재생이 차단되었습니다. 다시 시작해 주세요.",
      );
    });
  }, [busy]);

  useEffect(() => {
    return () => {
      operationIdRef.current += 1;
      lifecycleEnabledRef.current = false;
      clearLifecycleTimers();
      releaseMedia();

      if (sessionIdRef.current) {
        void endInterpreterSession(sessionIdRef.current, "user_stop");
      }
    };
  }, [clearLifecycleTimers, releaseMedia]);

  return {
    status,
    active,
    busy,
    muted,
    inputLevel: shouldUseMockRealtime() ? mockLevel : measuredInputLevel,
    outputLevel: shouldUseMockRealtime() ? mockLevel : measuredOutputLevel,
    errorMessage,
    start,
    stop,
    toggleMute,
  };
}

async function recordInterpreterUsage(
  sessionId: string,
  eventType: "session_started" | "session_stopped",
) {
  try {
    await recordUsageEvent({
      sessionId,
      eventType,
      mode: "conversation",
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Usage reporting must never interrupt a live interpretation session.
  }
}

async function endInterpreterSession(sessionId: string, reason: StopReason) {
  try {
    await endRealtimeSession({ sessionId, reason });
    await recordInterpreterUsage(sessionId, "session_stopped");
  } catch {
    // Session cleanup is best effort when the browser or network is closing.
  }
}

function isMuteOverridableStatus(status: InterpreterStatus): boolean {
  return (
    status === "listening" ||
    status === "user_speaking" ||
    status === "interpreting" ||
    status === "assistant_speaking"
  );
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
