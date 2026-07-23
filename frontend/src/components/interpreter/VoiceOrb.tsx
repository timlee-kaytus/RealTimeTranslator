"use client";

import { MicOff } from "lucide-react";

import type { InterpreterStatus } from "@/lib/types/interpreter";

type VoiceOrbProps = {
  status: InterpreterStatus;
  inputLevel: number;
  outputLevel: number;
  active: boolean;
  busy: boolean;
  muted: boolean;
  onToggleMute: () => void;
};

const barFactors = [0.46, 0.68, 0.9, 1, 0.82, 0.62, 0.42];

export function VoiceOrb({
  status,
  inputLevel,
  outputLevel,
  active,
  busy,
  muted,
  onToggleMute,
}: VoiceOrbProps) {
  const disabled = !active || busy;
  const level = selectVisibleLevel(status, inputLevel, outputLevel, muted);
  const processing = status === "interpreting" || status === "reconnecting";
  const speaking =
    status === "user_speaking" || status === "assistant_speaking";
  const title = muted ? "마이크 음소거 해제" : "마이크 음소거";

  return (
    <button
      type="button"
      aria-label={title}
      aria-pressed={muted}
      disabled={disabled}
      title={disabled ? "통역 연결 후 사용할 수 있습니다." : title}
      onClick={onToggleMute}
      className={`interpreter-orb relative grid size-64 shrink-0 place-items-center rounded-full border-[10px] sm:size-72 md:size-80 ${
        muted
          ? "interpreter-orb--muted border-[#c8c9d3] bg-[#686b82]"
          : speaking
            ? "interpreter-orb--speaking border-[#d8ccff] bg-[#5b1ecf]"
            : "interpreter-orb--listening border-[#ded6ff] bg-[#7132f5]"
      } ${disabled ? "cursor-default opacity-80" : "cursor-pointer"}`}
    >
      <span
        aria-hidden
        className="absolute inset-5 rounded-full border border-white/30 bg-[#4f24b8]/45"
      />
      <span
        aria-hidden
        className="absolute inset-10 rounded-full border border-white/20 bg-[#2f176f]/30"
      />

      {muted ? (
        <span className="relative grid size-24 place-items-center rounded-full border border-white/30 bg-black/15 text-white">
          <MicOff aria-hidden className="size-11" strokeWidth={1.8} />
        </span>
      ) : (
        <span
          aria-hidden
          className="relative flex h-28 items-center justify-center gap-2 sm:h-32 sm:gap-2.5"
        >
          {barFactors.map((factor, index) => {
            const height = getBarHeight(level, factor, status);

            return (
              <span
                key={`${factor}-${index}`}
                className={`interpreter-orb__bar w-2.5 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.28)] sm:w-3 ${
                  processing ? "interpreter-orb__bar--processing" : ""
                }`}
                style={{
                  height: `${height}px`,
                  animationDelay: `${index * 90}ms`,
                }}
              />
            );
          })}
        </span>
      )}
    </button>
  );
}

function selectVisibleLevel(
  status: InterpreterStatus,
  inputLevel: number,
  outputLevel: number,
  muted: boolean,
): number {
  if (muted) {
    return 0;
  }

  if (status === "assistant_speaking") {
    return clampLevel(outputLevel);
  }

  return clampLevel(inputLevel);
}

function getBarHeight(
  level: number,
  factor: number,
  status: InterpreterStatus,
): number {
  const minimum = status === "idle" || status === "stopped" ? 12 : 18;
  const amplified = Math.min(1, level * 1.8);
  return Math.round(minimum + amplified * 88 * factor);
}

function clampLevel(level: number): number {
  return Math.min(1, Math.max(0, level));
}
