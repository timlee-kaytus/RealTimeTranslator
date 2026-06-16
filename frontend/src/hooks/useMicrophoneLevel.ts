"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SPEECH_LEVEL_THRESHOLD = 0.08;
const NOISE_FLOOR = 0.015;
const SMOOTHING = 0.72;
const LEVEL_UPDATE_MS = 80;

type BrowserAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

type UseMicrophoneLevelResult = {
  level: number;
  speaking: boolean;
  start: (stream: MediaStream) => void;
  stop: () => void;
};

export function useMicrophoneLevel(): UseMicrophoneLevelResult {
  const [level, setLevel] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const smoothedLevelRef = useRef(0);
  const lastUpdateRef = useRef(0);

  const stop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    sourceRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;

    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }

    lastUpdateRef.current = 0;
    smoothedLevelRef.current = 0;
    setLevel(0);
    setSpeaking(false);
  }, []);

  const start = useCallback(
    (stream: MediaStream) => {
      stop();

      if (stream.getAudioTracks().length === 0) {
        return;
      }

      const AudioContextConstructor =
        window.AudioContext ||
        (window as BrowserAudioWindow).webkitAudioContext;

      if (!AudioContextConstructor) {
        return;
      }

      const audioContext = new AudioContextConstructor();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);

      const data = new Uint8Array(analyser.fftSize);

      audioContextRef.current = audioContext;
      sourceRef.current = source;
      analyserRef.current = analyser;

      if (audioContext.state === "suspended") {
        void audioContext.resume().catch(() => undefined);
      }

      const tick = (timestamp: number) => {
        if (timestamp - lastUpdateRef.current >= LEVEL_UPDATE_MS) {
          analyser.getByteTimeDomainData(data);

          let sumSquares = 0;

          for (const value of data) {
            const normalized = (value - 128) / 128;
            sumSquares += normalized * normalized;
          }

          const rms = Math.sqrt(sumSquares / data.length);
          const measuredLevel = Math.min(
            1,
            Math.max(0, (rms - NOISE_FLOOR) * 4.5),
          );

          smoothedLevelRef.current =
            smoothedLevelRef.current * SMOOTHING +
            measuredLevel * (1 - SMOOTHING);

          setLevel(smoothedLevelRef.current);
          setSpeaking(smoothedLevelRef.current >= SPEECH_LEVEL_THRESHOLD);
          lastUpdateRef.current = timestamp;
        }

        animationFrameRef.current = window.requestAnimationFrame(tick);
      };

      animationFrameRef.current = window.requestAnimationFrame(tick);
    },
    [stop],
  );

  useEffect(() => stop, [stop]);

  return {
    level,
    speaking,
    start,
    stop,
  };
}
