"use client";

import { Mic, Square } from "lucide-react";

type MicToggleButtonProps = {
  active: boolean;
  compact?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export function MicToggleButton({
  active,
  compact = false,
  disabled = false,
  onClick,
}: MicToggleButtonProps) {
  const Icon = active ? Square : Mic;
  const buttonClassName = compact
    ? "inline-flex h-8 w-fit items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-zinc-950 px-3 !text-xs font-bold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
    : "inline-flex h-12 min-w-38 items-center justify-center gap-2 rounded-[8px] bg-zinc-950 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400";
  const iconClassName = compact ? "size-4" : "size-5";

  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={buttonClassName}
    >
      <Icon aria-hidden className={iconClassName} />
      {active ? "통역 중지" : "통역 시작"}
    </button>
  );
}
