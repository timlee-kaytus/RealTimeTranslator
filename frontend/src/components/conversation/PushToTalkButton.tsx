"use client";

import type { KeyboardEvent, PointerEvent } from "react";
import { Mic } from "lucide-react";

type PushToTalkButtonProps = {
  active: boolean;
  disabled?: boolean;
  onPressStart: () => void;
  onPressEnd: () => void;
};

export function PushToTalkButton({
  active,
  disabled = false,
  onPressStart,
  onPressEnd,
}: PushToTalkButtonProps) {
  const buttonClassName = active
    ? "inline-flex h-8 w-fit items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-700 bg-emerald-600 px-3 text-xs font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:border-zinc-300 disabled:bg-zinc-300"
    : "inline-flex h-8 w-fit items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-cyan-700 bg-cyan-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:border-zinc-300 disabled:bg-zinc-300";

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (disabled || event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    onPressStart();
  }

  function handlePointerEnd(event: PointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    onPressEnd();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled || event.repeat) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      onPressStart();
    }
  }

  function handleKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      onPressEnd();
    }
  }

  return (
    <button
      type="button"
      aria-label="끊어말하기"
      aria-pressed={active}
      disabled={disabled}
      onBlur={onPressEnd}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerEnd}
      className={`${buttonClassName} select-none touch-none`}
    >
      <Mic aria-hidden className="size-4" />
      끊어말하기
    </button>
  );
}
