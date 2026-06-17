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
  const meterColor = speaking ? "bg-[#149e61]" : "bg-[#7132f5]";

  return (
    <div
      className={`inline-flex h-10 min-w-28 items-center gap-2 rounded-[12px] border px-3 ${
        disabled
          ? "border-[#dedee5] bg-[rgba(148,151,169,0.08)] text-[#9497a9]"
          : speaking
            ? "border-[rgba(20,158,97,0.24)] bg-[rgba(20,158,97,0.16)] text-[#026b3f]"
            : "border-[#dedee5] bg-white text-[#686b82]"
      }`}
    >
      <span className="shrink-0 text-xs font-bold">마이크(麦克风)</span>
      <div
        aria-label="마이크 입력 레벨"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={disabled ? 0 : percent}
        className="h-2 w-12 shrink-0 overflow-hidden rounded-full bg-[rgba(148,151,169,0.14)]"
        role="meter"
      >
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-150 ${
            disabled ? "bg-[#c4c6d1]" : meterColor
          }`}
          style={{ width: disabled ? "0%" : `${percent}%` }}
        />
      </div>
    </div>
  );
}
