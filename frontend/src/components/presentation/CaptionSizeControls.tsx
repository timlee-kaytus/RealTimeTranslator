"use client";

import type { Dispatch, SetStateAction } from "react";
import { Blend, Minus, Plus, Type } from "lucide-react";

import type { FloatingCaptionSettings } from "@/lib/types/settings";

type CaptionSizeControlsProps = {
  settings: FloatingCaptionSettings;
  onSettingsChange: Dispatch<SetStateAction<FloatingCaptionSettings>>;
};

export function CaptionSizeControls({
  settings,
  onSettingsChange,
}: CaptionSizeControlsProps) {
  function adjustFontSize(delta: number) {
    onSettingsChange((current) => ({
      ...current,
      fontSize: clampFontSize(current.fontSize + delta),
    }));
  }

  function adjustTransparency(delta: number) {
    onSettingsChange((current) => ({
      ...current,
      backgroundOpacity: clampBackgroundOpacity(
        current.backgroundOpacity - delta,
      ),
    }));
  }

  function setTransparencyPercent(percent: number) {
    onSettingsChange((current) => ({
      ...current,
      backgroundOpacity: clampBackgroundOpacity(1 - percent / 100),
    }));
  }

  const transparencyPercent = Math.round(
    (1 - settings.backgroundOpacity) * 100,
  );

  return (
    <div className="space-y-4 rounded-[8px] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-black text-zinc-800">
        <Type aria-hidden className="size-4 text-emerald-700" />
        자막 크기
      </div>

      <div className="grid grid-cols-[44px_1fr_44px] items-center gap-3">
        <button
          type="button"
          aria-label="글자 작게"
          onClick={() => adjustFontSize(-4)}
          className="grid size-11 place-items-center rounded-[8px] border border-zinc-300 bg-white text-zinc-800 transition hover:border-zinc-500"
        >
          <Minus aria-hidden className="size-5" />
        </button>
        <input
          aria-label="글자 크기"
          type="range"
          min={24}
          max={88}
          step={2}
          value={settings.fontSize}
          onChange={(event) =>
            onSettingsChange((current) => ({
              ...current,
              fontSize: Number(event.target.value),
            }))
          }
          className="w-full accent-emerald-700"
        />
        <button
          type="button"
          aria-label="글자 크게"
          onClick={() => adjustFontSize(4)}
          className="grid size-11 place-items-center rounded-[8px] border border-zinc-300 bg-white text-zinc-800 transition hover:border-zinc-500"
        >
          <Plus aria-hidden className="size-5" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-black text-zinc-800">
          <Blend aria-hidden className="size-4 text-emerald-700" />
          배경 투명도
        </div>
        <span className="text-sm font-black tabular-nums text-zinc-950">
          {transparencyPercent}%
        </span>
      </div>

      <div className="grid grid-cols-[44px_1fr_44px] items-center gap-3">
        <button
          type="button"
          aria-label="투명도 낮춤"
          onClick={() => adjustTransparency(-0.1)}
          className="grid size-11 place-items-center rounded-[8px] border border-zinc-300 bg-white text-zinc-800 transition hover:border-zinc-500"
        >
          <Minus aria-hidden className="size-5" />
        </button>
        <input
          aria-label="배경 투명도"
          type="range"
          min={15}
          max={85}
          step={1}
          value={transparencyPercent}
          onChange={(event) =>
            setTransparencyPercent(Number(event.target.value))
          }
          className="w-full accent-emerald-700"
        />
        <button
          type="button"
          aria-label="투명도 높임"
          onClick={() => adjustTransparency(0.1)}
          className="grid size-11 place-items-center rounded-[8px] border border-zinc-300 bg-white text-zinc-800 transition hover:border-zinc-500"
        >
          <Plus aria-hidden className="size-5" />
        </button>
      </div>
    </div>
  );
}

function clampFontSize(value: number) {
  return Math.min(88, Math.max(24, value));
}

function clampBackgroundOpacity(value: number) {
  return Math.min(0.85, Math.max(0.15, value));
}
