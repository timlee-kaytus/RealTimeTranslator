"use client";

type MicLevelMeterProps = {
  level: number;
  speaking: boolean;
  disabled?: boolean;
};

export function MicLevelMeter({
  level,
  speaking,
  disabled = false,
}: MicLevelMeterProps) {
  const percent = Math.round(Math.min(1, Math.max(0, level) * 2) * 100);
  const meterColor = speaking ? "bg-emerald-500" : "bg-zinc-950";

  return (
    <div
      className={`inline-flex h-10 min-w-28 items-center gap-2 rounded-[8px] border px-3 ${
        disabled
          ? "border-zinc-200 bg-zinc-50 text-zinc-400"
          : speaking
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-zinc-200 bg-white text-zinc-700"
      }`}
    >
      <span className="shrink-0 text-xs font-bold">마이크(麦克风)</span>
      <div
        aria-label="마이크 입력 레벨"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={disabled ? 0 : percent}
        className="h-2 w-12 shrink-0 overflow-hidden rounded-full bg-zinc-200"
        role="meter"
      >
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-150 ${
            disabled ? "bg-zinc-300" : meterColor
          }`}
          style={{ width: disabled ? "0%" : `${percent}%` }}
        />
      </div>
    </div>
  );
}
