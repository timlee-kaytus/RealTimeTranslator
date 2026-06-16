import { shouldUseMockRealtime } from "./backendClient";
import type { RealtimeConnectionStatus } from "@/lib/types/realtime";

const OPENAI_TRANSLATION_CALL_URL =
  "https://api.openai.com/v1/realtime/translations/calls";

const realtimeErrorMessages = {
  microphone_permission:
    "마이크 권한이 필요합니다. 브라우저 주소창의 권한 설정에서 마이크를 허용해 주세요.",
  openai_connection:
    "OpenAI 실시간 번역 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  session_expired: "세션 시간이 만료되어 통역을 자동으로 중지했습니다.",
  browser_unsupported:
    "현재 브라우저에서는 실시간 마이크 통역을 사용할 수 없습니다. 최신 Chrome 또는 Edge를 사용해 주세요.",
  network:
    "네트워크 연결이 불안정합니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.",
  unknown: "실시간 통역 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
} as const;

type RealtimeTranslationEvent = {
  type?: string;
  delta?: unknown;
  transcript?: unknown;
  text?: unknown;
  error?: {
    message?: unknown;
  };
};

export type RealtimeTranslationConnection = {
  close: () => void;
};

export type ConnectRealtimeTranslationOptions = {
  sourceStream: MediaStream;
  clientSecret: string;
  onStatusChange?: (status: RealtimeConnectionStatus) => void;
  onTranscriptDelta: (delta: string) => void;
  onTranscriptFinal?: (text: string) => void;
  onError?: (message: string) => void;
};

export function getRealtimeUserMessage(
  error: unknown,
  fallback: string = realtimeErrorMessages.unknown,
): string {
  if (isPermissionError(error)) {
    return realtimeErrorMessages.microphone_permission;
  }

  if (isNetworkError(error)) {
    return realtimeErrorMessages.network;
  }

  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";

  if (message === realtimeErrorMessages.session_expired) {
    return realtimeErrorMessages.session_expired;
  }

  if (/microphone|마이크|permission|denied|notallowed/i.test(message)) {
    return realtimeErrorMessages.microphone_permission;
  }

  if (/browser|unsupported|mediaDevices|webrtc|브라우저/i.test(message)) {
    return realtimeErrorMessages.browser_unsupported;
  }

  if (/network|fetch|internet|offline|네트워크/i.test(message)) {
    return realtimeErrorMessages.network;
  }

  if (/openai|sdp|realtime|translation|connection|연결/i.test(message)) {
    return realtimeErrorMessages.openai_connection;
  }

  return fallback;
}

export function getSessionExpiredMessage(): string {
  return realtimeErrorMessages.session_expired;
}

export async function requestMicrophoneAccess(): Promise<MediaStream | null> {
  if (shouldUseMockRealtime()) {
    return null;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(realtimeErrorMessages.browser_unsupported);
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
  } catch (error) {
    throw new Error(getRealtimeUserMessage(error));
  }
}

export async function connectOpenAIRealtimeTranslation({
  sourceStream,
  clientSecret,
  onStatusChange,
  onTranscriptDelta,
  onTranscriptFinal,
  onError,
}: ConnectRealtimeTranslationOptions): Promise<RealtimeTranslationConnection> {
  if (typeof RTCPeerConnection === "undefined") {
    throw new Error(realtimeErrorMessages.browser_unsupported);
  }

  const audioTracks = sourceStream.getAudioTracks();

  if (audioTracks.length === 0) {
    sourceStream.getTracks().forEach((track) => track.stop());
    throw new Error(realtimeErrorMessages.microphone_permission);
  }

  const peerConnection = new RTCPeerConnection();
  const dataChannel = peerConnection.createDataChannel("oai-events");
  const cleanup = createConnectionCleanup(
    peerConnection,
    sourceStream,
    dataChannel,
  );

  try {
    audioTracks.forEach((track) => {
      peerConnection.addTrack(track, sourceStream);
    });

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;

      if (state === "connected") {
        onStatusChange?.("listening");
        return;
      }

      if (state === "disconnected") {
        onStatusChange?.("reconnecting");
        return;
      }

      if (state === "failed") {
        onStatusChange?.("error");
        onError?.(realtimeErrorMessages.network);
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      if (peerConnection.iceConnectionState === "failed") {
        onError?.(realtimeErrorMessages.network);
      }
    };

    peerConnection.ontrack = ({ track }) => {
      track.enabled = false;
    };

    peerConnection.ondatachannel = ({ channel }) => {
      if (channel.label === "oai-events") {
        attachRealtimeEventHandlers(channel, {
          onStatusChange,
          onTranscriptDelta,
          onTranscriptFinal,
          onError,
        });
      }
    };

    attachRealtimeEventHandlers(dataChannel, {
      onStatusChange,
      onTranscriptDelta,
      onTranscriptFinal,
      onError,
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    if (!offer.sdp) {
      throw new Error(realtimeErrorMessages.openai_connection);
    }

    const sdpResponse = await fetch(OPENAI_TRANSLATION_CALL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientSecret}`,
        "Content-Type": "application/sdp",
      },
      body: offer.sdp,
    });

    if (!sdpResponse.ok) {
      throw new Error(await readOpenAIErrorMessage(sdpResponse));
    }

    await peerConnection.setRemoteDescription({
      type: "answer",
      sdp: await sdpResponse.text(),
    });

    onStatusChange?.("listening");

    return {
      close: cleanup,
    };
  } catch (error) {
    cleanup();
    throw new Error(getRealtimeUserMessage(error));
  }
}

function attachRealtimeEventHandlers(
  dataChannel: RTCDataChannel,
  {
    onStatusChange,
    onTranscriptDelta,
    onTranscriptFinal,
    onError,
  }: Omit<ConnectRealtimeTranslationOptions, "sourceStream" | "clientSecret">,
) {
  dataChannel.onopen = () => {
    onStatusChange?.("listening");
  };

  dataChannel.onmessage = ({ data }) => {
    const event = parseRealtimeTranslationEvent(data);

    if (!event.type) {
      return;
    }

    if (event.type === "session.output_transcript.delta") {
      const delta = readEventText(event.delta);

      if (delta) {
        onStatusChange?.("translating");
        onTranscriptDelta(delta);
      }
      return;
    }

    if (
      event.type === "session.output_transcript.done" ||
      event.type === "session.output_transcript.final"
    ) {
      onTranscriptFinal?.(
        readEventText(event.transcript) ?? readEventText(event.text) ?? "",
      );
      onStatusChange?.("listening");
      return;
    }

    if (event.type === "session.closed") {
      onStatusChange?.("stopped");
      return;
    }

    if (event.type === "error") {
      onStatusChange?.("error");
      onError?.(
        getRealtimeUserMessage(
          readEventText(event.error?.message),
          realtimeErrorMessages.openai_connection,
        ),
      );
    }
  };

  dataChannel.onerror = () => {
    onStatusChange?.("error");
    onError?.(realtimeErrorMessages.network);
  };

  dataChannel.onclose = () => {
    onStatusChange?.("stopped");
  };
}

function parseRealtimeTranslationEvent(data: unknown): RealtimeTranslationEvent {
  if (typeof data !== "string") {
    return {};
  }

  try {
    const parsed = JSON.parse(data) as RealtimeTranslationEvent;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readEventText(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

async function readOpenAIErrorMessage(response: Response): Promise<string> {
  const body = await response.text();

  if (!body) {
    return realtimeErrorMessages.openai_connection;
  }

  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    return (
      getRealtimeUserMessage(
        parsed.error?.message,
        realtimeErrorMessages.openai_connection,
      )
    );
  } catch {
    return getRealtimeUserMessage(body, realtimeErrorMessages.openai_connection);
  }
}

function createConnectionCleanup(
  peerConnection: RTCPeerConnection,
  sourceStream: MediaStream,
  dataChannel: RTCDataChannel,
) {
  let closed = false;

  return () => {
    if (closed) {
      return;
    }

    closed = true;

    if (dataChannel.readyState !== "closed") {
      dataChannel.close();
    }

    peerConnection.getSenders().forEach((sender) => {
      sender.track?.stop();
    });
    sourceStream.getTracks().forEach((track) => track.stop());
    peerConnection.close();
  };
}

function isPermissionError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "NotAllowedError" ||
      error.name === "PermissionDeniedError" ||
      error.name === "SecurityError")
  );
}

function isNetworkError(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    /fetch|network|load failed|failed to fetch/i.test(error.message)
  );
}
