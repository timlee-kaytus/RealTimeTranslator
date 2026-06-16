import { shouldUseMockRealtime } from "./backendClient";
import type { RealtimeConnectionStatus } from "@/lib/types/realtime";

const OPENAI_TRANSLATION_CALL_URL =
  "https://api.openai.com/v1/realtime/translations/calls";

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

export async function requestMicrophoneAccess(): Promise<MediaStream | null> {
  if (shouldUseMockRealtime()) {
    return null;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("이 브라우저에서는 마이크 권한을 요청할 수 없습니다.");
  }

  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
    },
  });
}

export async function connectOpenAIRealtimeTranslation({
  sourceStream,
  clientSecret,
  onStatusChange,
  onTranscriptDelta,
  onTranscriptFinal,
  onError,
}: ConnectRealtimeTranslationOptions): Promise<RealtimeTranslationConnection> {
  const audioTracks = sourceStream.getAudioTracks();

  if (audioTracks.length === 0) {
    sourceStream.getTracks().forEach((track) => track.stop());
    throw new Error("마이크 오디오 트랙을 찾지 못했습니다.");
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
      }

      if (state === "disconnected" || state === "failed") {
        onStatusChange?.(state === "failed" ? "error" : "reconnecting");
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      if (peerConnection.iceConnectionState === "failed") {
        onError?.("OpenAI WebRTC 연결이 끊어졌습니다.");
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
      throw new Error("WebRTC SDP offer 생성에 실패했습니다.");
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
    throw error;
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
        readEventText(event.error?.message) ??
          "OpenAI Realtime Translation 오류가 발생했습니다.",
      );
    }
  };

  dataChannel.onerror = () => {
    onStatusChange?.("error");
    onError?.("OpenAI 이벤트 채널 오류가 발생했습니다.");
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
    return "OpenAI Realtime Translation 연결 요청이 실패했습니다.";
  }

  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    return (
      parsed.error?.message ??
      "OpenAI Realtime Translation 연결 요청이 실패했습니다."
    );
  } catch {
    return body;
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

    if (dataChannel.readyState === "open") {
      dataChannel.close();
    }

    peerConnection.getSenders().forEach((sender) => {
      sender.track?.stop();
    });
    sourceStream.getTracks().forEach((track) => track.stop());
    peerConnection.close();
  };
}
