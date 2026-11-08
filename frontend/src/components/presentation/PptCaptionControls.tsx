"use client";

import {
  Minus,
  PanelBottom,
  PanelLeft,
  PanelRight,
  PanelTop,
  Plus,
  Type,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

import { useUiLanguage, type UiMessageKey } from "@/lib/i18n/uiLanguage";
import {
  FLOATING_CAPTION_FONT_SIZE_MAX,
  FLOATING_CAPTION_FONT_SIZE_MIN,
  type FloatingCaptionSettings,
} from "@/lib/types/settings";

export type PptCaptionPosition = "top" | "bottom" | "left" | "right";

type PptCaptionControlsProps = {
  settings: FloatingCaptionSettings;
  position: PptCaptionPosition;
  onSettingsChange: Dispatch<SetStateAction<FloatingCaptionSettings>>;
  onPositionChange: (position: PptCaptionPosition) => void;
};

const captionPositions = [
  { value: "top" as const, labelKey: "captionTop" as UiMessageKey, Icon: PanelTop },
  {
    value: "bottom" as const,
    labelKey: "captionBottom" as UiMessageKey,
    Icon: PanelBottom,
  },
  {
    value: "left" as const,
    labelKey: "captionLeft" as UiMessageKey,
    Icon: PanelLeft,
  },
  {
    value: "right" as const,
    labelKey: "captionRight" as UiMessageKey,
    Icon: PanelRight,
  },
];

export function PptCaptionControls({
  settings,
  position,
  onSettingsChange,
  onPositionChange,
}: PptCaptionControlsProps) {
  const { t } = useUiLanguage();

  function adjustFontSize(delta: number) {
    onSettingsChange((current) => ({
      ...current,
      fontSize: clampFontSize(current.fontSize + delta),
    }));
  }

  return (
    <div className="rtt-card space-y-5 p-4">
      <div className="flex items-center gap-2 text-sm font-black text-[#101114]">
        <Type aria-hidden className="size-4 text-[#7132f5]" />
        {t("captionSize")}
      </div>

      <div className="grid grid-cols-[44px_1fr_44px] items-center gap-3">
        <button
          type="button"
          aria-label={t("decreaseFontSize")}
          onClick={() => adjustFontSize(-4)}
          className="rtt-icon-button"
        >
          <Minus aria-hidden className="size-5" />
        </button>
        <input
          aria-label={t("fontSize")}
          type="range"
          min={FLOATING_CAPTION_FONT_SIZE_MIN}
          max={FLOATING_CAPTION_FONT_SIZE_MAX}
          step={1}
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
          aria-label={t("increaseFontSize")}
          onClick={() => adjustFontSize(4)}
          className="rtt-icon-button"
        >
          <Plus aria-hidden className="size-5" />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-black text-[#101114]">
          <PanelBottom aria-hidden className="size-4 text-[#7132f5]" />
          {t("captionPosition")}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {captionPositions.map(({ value, labelKey, Icon }) => {
            const selected = value === position;

            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => onPositionChange(value)}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-bold transition ${
                  selected
                    ? "border-[#7132f5] bg-[#7132f5] text-white shadow-[rgba(0,0,0,0.03)_0px_4px_24px]"
                    : "border-[#dedee5] bg-white text-[#686b82] hover:border-[#bba7fa] hover:bg-[#f7f4ff] hover:text-[#5741d8]"
                }`}
              >
                <Icon aria-hidden className="size-4" />
                {t(labelKey)}
              </button>
            );
          })}
        </div>
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
