"use client";

import { Mic, Square } from "lucide-react";

type MicToggleButtonProps = {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export function MicToggleButton({
  active,
  disabled = false,
  onClick,
}: MicToggleButtonProps) {
  const Icon = active ? Square : Mic;

  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-12 min-w-38 items-center justify-center gap-2 rounded-[8px] bg-zinc-950 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
    >
      <Icon aria-hidden className="size-5" />
      {active ? "통역 중지" : "통역 시작"}
    </button>
  );
}

