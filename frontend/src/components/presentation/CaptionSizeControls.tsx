"use client";

import type { Dispatch, SetStateAction } from "react";
import { Minus, Plus, Type } from "lucide-react";

import {
  FLOATING_CAPTION_PRESETS,
  type FloatingCaptionSettings,
  type FloatingPreset,
} from "@/lib/types/settings";

type CaptionSizeControlsProps = {
  settings: FloatingCaptionSettings;
  onSettingsChange: Dispatch<SetStateAction<FloatingCaptionSettings>>;
};

const presetLabels: Record<FloatingPreset, string> = {
  small: "작게",
  medium: "보통",
  large: "크게",
  bottom_bar: "하단바",
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

  return (
    <div className="space-y-4 rounded-[8px] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-black text-zinc-800">
        <Type aria-hidden className="size-4 text-emerald-700" />
        자막 크기
      </div>

      <div className="grid grid-cols-4 gap-2">
        {(Object.keys(FLOATING_CAPTION_PRESETS) as FloatingPreset[]).map(
          (preset) => {
            const selected = settings.preset === preset;

            return (
              <button
                key={preset}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  onSettingsChange(FLOATING_CAPTION_PRESETS[preset])
                }
                className={`h-10 rounded-[8px] border px-2 text-sm font-bold transition ${
                  selected
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500"
                }`}
              >
                {presetLabels[preset]}
              </button>
            );
          },
        )}
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

      <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-zinc-500">
        <span>{settings.width}px</span>
        <span>{settings.height}px</span>
        <span>{settings.fontSize}px</span>
      </div>
    </div>
  );
}

function clampFontSize(value: number) {
  return Math.min(88, Math.max(24, value));
}

