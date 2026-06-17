"use client";

import type { Dispatch, SetStateAction } from "react";
import { Blend, Minus, Plus, Type } from "lucide-react";

import {
  FLOATING_CAPTION_FONT_SIZE_MAX,
  FLOATING_CAPTION_FONT_SIZE_MIN,
  type FloatingCaptionSettings,
} from "@/lib/types/settings";

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
    <div className="rtt-card space-y-4 p-4">
      <div className="flex items-center gap-2 text-sm font-black text-[#101114]">
        <Type aria-hidden className="size-4 text-[#7132f5]" />
        자막 크기
      </div>

      <div className="grid grid-cols-[44px_1fr_44px] items-center gap-3">
        <button
          type="button"
          aria-label="글자 작게"
          onClick={() => adjustFontSize(-4)}
          className="rtt-icon-button"
        >
          <Minus aria-hidden className="size-5" />
        </button>
        <input
          aria-label="글자 크기"
          type="range"
          min={FLOATING_CAPTION_FONT_SIZE_MIN}
          max={FLOATING_CAPTION_FONT_SIZE_MAX}
          step={2}
          value={clampFontSize(settings.fontSize)}
          onChange={(event) =>
            onSettingsChange((current) => ({
              ...current,
              fontSize: Number(event.target.value),
            }))
          }
          className="rtt-range w-full"
        />
        <button
          type="button"
          aria-label="글자 크게"
          onClick={() => adjustFontSize(4)}
          className="rtt-icon-button"
        >
          <Plus aria-hidden className="size-5" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-black text-[#101114]">
          <Blend aria-hidden className="size-4 text-[#7132f5]" />
          배경 투명도
        </div>
        <span className="text-sm font-black tabular-nums text-[#686b82]">
          {transparencyPercent}%
        </span>
      </div>

      <div className="grid grid-cols-[44px_1fr_44px] items-center gap-3">
        <button
          type="button"
          aria-label="투명도 낮춤"
          onClick={() => adjustTransparency(-0.1)}
          className="rtt-icon-button"
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
          className="rtt-range w-full"
        />
        <button
          type="button"
          aria-label="투명도 높임"
          onClick={() => adjustTransparency(0.1)}
          className="rtt-icon-button"
        >
          <Plus aria-hidden className="size-5" />
        </button>
      </div>
    </div>
  );
}

function clampFontSize(value: number) {
  return Math.min(
    FLOATING_CAPTION_FONT_SIZE_MAX,
    Math.max(FLOATING_CAPTION_FONT_SIZE_MIN, value),
  );
}

function clampBackgroundOpacity(value: number) {
  return Math.min(0.85, Math.max(0.15, value));
}
