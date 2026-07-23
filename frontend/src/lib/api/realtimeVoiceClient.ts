import type {
  InterpreterTranscriptEvent,
  InterpreterVoiceEvent,
} from "@/lib/types/interpreter";

const OPENAI_REALTIME_CALL_URL = "https://api.openai.com/v1/realtime/calls";

const interpreterConnectionMessages = {
  browser:
    "현재 브라우저에서는 실시간 음성 통역을 사용할 수 없습니다. 최신 Chrome 또는 Edge를 사용해 주세요.",
  connection:
    "OpenAI 실시간 통역 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  network:
    "네트워크 연결이 불안정합니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.",
  playback:
    "통역 음성 자동 재생이 차단되었습니다. 화면을 한 번 누른 후 다시 시작해 주세요.",
} as const;

type RealtimeVoiceServerEvent = {
  type?: string;
  delta?: unknown;
  transcript?: unknown;
  item_id?: unknown;
  response_id?: unknown;
  error?: {
    message?: unknown;
  };
};

export type RealtimeVoiceConnection = {
  close: () => void;
  setMuted: (muted: boolean) => void;
  resumeAudio: () => Promise<void>;
};

export type ConnectRealtimeVoiceOptions = {
  sourceStream: MediaStream;
  clientSecret: string;
  onVoiceEvent?: (event: InterpreterVoiceEvent) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onInputTranscriptDelta?: (event: InterpreterTranscriptEvent) => void;
  onInputTranscriptFinal?: (event: InterpreterTranscriptEvent) => void;
  onOutputTranscriptDelta?: (event: InterpreterTranscriptEvent) => void;
  onOutputTranscriptFinal?: (event: InterpreterTranscriptEvent) => void;
  onError?: (message: string) => void;
};

export async function connectOpenAIRealtimeVoice({
  sourceStream,
  clientSecret,
  onVoiceEvent,
  onRemoteStream,
  onInputTranscriptDelta,
  onInputTranscriptFinal,
  onOutputTranscriptDelta,
  onOutputTranscriptFinal,
  onError,
}: ConnectRealtimeVoiceOptions): Promise<RealtimeVoiceConnection> {
  if (typeof RTCPeerConnection === "undefined") {
    throw new Error(interpreterConnectionMessages.browser);
  }

  const audioTracks = sourceStream.getAudioTracks();

  if (audioTracks.length === 0) {
    throw new Error("마이크 오디오 트랙을 찾지 못했습니다.");
  }

  const peerConnection = new RTCPeerConnection();
  const dataChannel = peerConnection.createDataChannel("oai-events");
  const attachedChannels = new Set<RTCDataChannel>();
  const audioElement = createRemoteAudioElement();
  let closed = false;

  const emitVoiceEvent = (event: InterpreterVoiceEvent) => {
    if (!closed) {
      onVoiceEvent?.(event);
    }
  };

  const reportError = (message: string) => {
    if (!closed) {
      onError?.(message);
    }
  };

  const attachDataChannel = (channel: RTCDataChannel) => {
    if (attachedChannels.has(channel)) {
      return;
    }

    attachedChannels.add(channel);
    channel.onopen = () => emitVoiceEvent("connected");
    channel.onmessage = ({ data }) => {
      const event = parseRealtimeVoiceEvent(data);

      if (!event.type) {
        return;
      }

      handleRealtimeVoiceEvent(event, {
        emitVoiceEvent,
        onInputTranscriptDelta,
        onInputTranscriptFinal,
        onOutputTranscriptDelta,
        onOutputTranscriptFinal,
        reportError,
      });
    };
    channel.onerror = () => reportError(interpreterConnectionMessages.network);
    channel.onclose = () => emitVoiceEvent("session_closed");
  };

  const cleanup = () => {
    if (closed) {
      return;
    }

    closed = true;
    attachedChannels.forEach((channel) => {
      channel.onopen = null;
      channel.onmessage = null;
      channel.onerror = null;
      channel.onclose = null;

      if (channel.readyState !== "closed") {
        channel.close();
      }
    });
    attachedChannels.clear();
    peerConnection.onconnectionstatechange = null;
    peerConnection.oniceconnectionstatechange = null;
    peerConnection.ondatachannel = null;
    peerConnection.ontrack = null;
    peerConnection.close();
    audioElement.pause();
    audioElement.srcObject = null;
    audioElement.remove();
  };

  try {
    audioTracks.forEach((track) => peerConnection.addTrack(track, sourceStream));

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;

      if (state === "connected") {
        emitVoiceEvent("connected");
      } else if (state === "disconnected") {
        emitVoiceEvent("disconnected");
      } else if (state === "failed") {
        reportError(interpreterConnectionMessages.network);
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      if (peerConnection.iceConnectionState === "failed") {
        reportError(interpreterConnectionMessages.network);
      }
    };

    peerConnection.ontrack = ({ track, streams }) => {
      if (track.kind !== "audio") {
        return;
      }

      const remoteStream = streams[0] ?? new MediaStream([track]);
      audioElement.srcObject = remoteStream;
      onRemoteStream?.(remoteStream);
      void audioElement
        .play()
        .catch(() => reportError(interpreterConnectionMessages.playback));
    };

    peerConnection.ondatachannel = ({ channel }) => {
      if (channel.label === "oai-events") {
        attachDataChannel(channel);
      }
    };

    attachDataChannel(dataChannel);

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    const localSdp = peerConnection.localDescription?.sdp;

    if (!localSdp) {
      throw new Error(interpreterConnectionMessages.connection);
    }

    const response = await fetch(OPENAI_REALTIME_CALL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientSecret}`,
        "Content-Type": "application/sdp",
      },
      body: localSdp,
    });

    if (!response.ok) {
      throw new Error(await readRealtimeErrorMessage(response));
    }

    await peerConnection.setRemoteDescription({
      type: "answer",
      sdp: await response.text(),
    });

    return {
      close: cleanup,
      setMuted: (muted) => {
        audioTracks.forEach((track) => {
          track.enabled = !muted;
        });
      },
      resumeAudio: async () => {
        await audioElement.play();
      },
    };
  } catch (error) {
    cleanup();
    throw new Error(getInterpreterConnectionMessage(error));
  }
}

function createRemoteAudioElement(): HTMLAudioElement {
  const audioElement = document.createElement("audio");
  audioElement.autoplay = true;
  audioElement.setAttribute("playsinline", "");
  audioElement.setAttribute("aria-hidden", "true");
  audioElement.dataset.rttInterpreterAudio = "true";
  audioElement.style.display = "none";
  document.body.appendChild(audioElement);
  return audioElement;
}

function handleRealtimeVoiceEvent(
  event: RealtimeVoiceServerEvent,
  handlers: {
    emitVoiceEvent: (event: InterpreterVoiceEvent) => void;
    onInputTranscriptDelta?: (event: InterpreterTranscriptEvent) => void;
    onInputTranscriptFinal?: (event: InterpreterTranscriptEvent) => void;
    onOutputTranscriptDelta?: (event: InterpreterTranscriptEvent) => void;
    onOutputTranscriptFinal?: (event: InterpreterTranscriptEvent) => void;
    reportError: (message: string) => void;
  },
) {
  const { type } = event;

  if (type === "input_audio_buffer.speech_started") {
    handlers.emitVoiceEvent("speech_started");
    return;
  }

  if (type === "input_audio_buffer.speech_stopped") {
    handlers.emitVoiceEvent("speech_stopped");
    return;
  }

  if (type === "response.created") {
    handlers.emitVoiceEvent("response_started");
    return;
  }

  if (type === "response.output_audio.delta") {
    handlers.emitVoiceEvent("response_audio_started");
    return;
  }

  if (type === "response.output_audio.done") {
    handlers.emitVoiceEvent("response_audio_done");
    return;
  }

  if (type === "response.done") {
    handlers.emitVoiceEvent("response_done");
    return;
  }

  if (type === "conversation.item.input_audio_transcription.delta") {
    const text = readEventText(event.delta);

    if (text) {
      handlers.onInputTranscriptDelta?.(createTranscriptEvent(event, text));
    }
    return;
  }

  if (type === "conversation.item.input_audio_transcription.completed") {
    handlers.onInputTranscriptFinal?.(
      createTranscriptEvent(event, readEventText(event.transcript) ?? ""),
    );
    return;
  }

  if (type === "response.output_audio_transcript.delta") {
    const text = readEventText(event.delta);

    if (text) {
      handlers.emitVoiceEvent("response_audio_started");
      handlers.onOutputTranscriptDelta?.(createTranscriptEvent(event, text));
    }
    return;
  }

  if (type === "response.output_audio_transcript.done") {
    handlers.onOutputTranscriptFinal?.(
      createTranscriptEvent(event, readEventText(event.transcript) ?? ""),
    );
    return;
  }

  if (type === "session.closed") {
    handlers.emitVoiceEvent("session_closed");
    return;
  }

  if (type === "error") {
    handlers.reportError(
      getInterpreterConnectionMessage(
        readEventText(event.error?.message) ??
          interpreterConnectionMessages.connection,
      ),
    );
  }
}

function createTranscriptEvent(
  event: RealtimeVoiceServerEvent,
  text: string,
): InterpreterTranscriptEvent {
  return {
    itemId: readEventText(event.item_id),
    responseId: readEventText(event.response_id),
    text,
  };
}

function parseRealtimeVoiceEvent(data: unknown): RealtimeVoiceServerEvent {
  if (typeof data !== "string") {
    return {};
  }

  try {
    const parsed = JSON.parse(data) as RealtimeVoiceServerEvent;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readEventText(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

async function readRealtimeErrorMessage(response: Response): Promise<string> {
  const body = await response.text();

  if (!body) {
    return interpreterConnectionMessages.connection;
  }

  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    return getInterpreterConnectionMessage(parsed.error?.message ?? body);
  } catch {
    return getInterpreterConnectionMessage(body);
  }
}

export function getInterpreterConnectionMessage(error: unknown): string {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";

  if (/permission|denied|notallowed|microphone|마이크/i.test(message)) {
    return "마이크 권한이 필요합니다. 브라우저 주소창의 권한 설정에서 마이크를 허용해 주세요.";
  }

  if (/browser|unsupported|mediaDevices|webrtc|브라우저/i.test(message)) {
    return interpreterConnectionMessages.browser;
  }

  if (/network|fetch|offline|internet|네트워크/i.test(message)) {
    return interpreterConnectionMessages.network;
  }

  if (/자동 재생|playback/i.test(message)) {
    return interpreterConnectionMessages.playback;
  }

  return interpreterConnectionMessages.connection;
}
