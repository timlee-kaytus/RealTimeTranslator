import { shouldUseMockRealtime } from "./backendClient";

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

