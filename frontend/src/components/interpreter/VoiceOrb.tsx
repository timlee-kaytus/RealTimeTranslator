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
    <div className="relative shrink-0">
      <div
        role="note"
        className="pointer-events-none absolute right-0 top-8 z-10 max-w-[210px] rounded-[10px] border border-[#d8ccff] bg-white px-3 py-2 text-left text-xs font-bold leading-snug text-[#4f5368] shadow-[0_8px_24px_rgba(77,42,157,0.14)] sm:-right-24 sm:top-5 sm:max-w-[280px] sm:text-sm"
      >
        클릭시 마이크 음소거(点击后麦克风静音)
        <span
          aria-hidden="true"
          className="absolute -bottom-2 left-7 size-4 rotate-45 border-b border-r border-[#d8ccff] bg-white sm:left-10"
        />
      </div>

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
    </div>
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
