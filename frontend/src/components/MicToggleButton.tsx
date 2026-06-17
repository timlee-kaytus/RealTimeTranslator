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
    ? `inline-flex h-9 w-fit items-center justify-center gap-1.5 whitespace-nowrap rounded-[12px] border px-3 !text-xs font-bold transition disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#c4c6d1] disabled:text-white ${
        active
          ? "border-[#dedee5] bg-[rgba(148,151,169,0.08)] text-[#101114] hover:bg-[#eef0f6]"
          : "border-transparent bg-[#7132f5] text-white shadow-[rgba(0,0,0,0.03)_0px_4px_24px] hover:bg-[#5741d8]"
      }`
    : `inline-flex h-12 min-w-38 items-center justify-center gap-2 rounded-[12px] border px-5 text-base font-bold transition disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#c4c6d1] disabled:text-white ${
        active
          ? "border-[#dedee5] bg-[rgba(148,151,169,0.08)] text-[#101114] hover:bg-[#eef0f6]"
          : "border-transparent bg-[#7132f5] text-white shadow-[rgba(0,0,0,0.03)_0px_4px_24px] hover:bg-[#5741d8]"
      }`;
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
      {active ? "통역 중지" : "실시간 번역(开始翻译)"}
    </button>
  );
}
