"use client";

import { FileText, Languages, Presentation } from "lucide-react";

import { useUiLanguage, type UiMessageKey } from "@/lib/i18n/uiLanguage";
import type { TranslationMode } from "@/lib/types/realtime";

type ModeSwitcherProps = {
  value: TranslationMode;
  onChange: (mode: TranslationMode) => void;
};

const modes = [
  {
    value: "conversation" as const,
    labelKey: "interpreterMode" as UiMessageKey,
    Icon: Languages,
  },
  {
    value: "presentation" as const,
    labelKey: "presentationMode" as UiMessageKey,
    Icon: Presentation,
  },
  {
    value: "ppt" as const,
    labelKey: "pptMode" as UiMessageKey,
    Icon: FileText,
  },
];

export function ModeSwitcher({ value, onChange }: ModeSwitcherProps) {
  const { t } = useUiLanguage();

  return (
    <div className="grid min-h-11 w-full grid-cols-3 rounded-[12px] border border-[#dedee5] bg-white p-1 shadow-[rgba(16,24,40,0.04)_0px_1px_4px] sm:w-auto">
      {modes.map(({ value: mode, labelKey, Icon }) => {
        const selected = value === mode;

        return (
          <button
            key={mode}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(mode)}
            className={`inline-flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] px-2 text-xs font-bold transition sm:min-w-36 sm:gap-2 sm:px-3 sm:text-sm ${
              selected
                ? "bg-[#7132f5] text-white shadow-[rgba(0,0,0,0.03)_0px_4px_24px]"
                : "bg-[rgba(148,151,169,0.08)] text-[#686b82] hover:bg-[#f4f2ff] hover:text-[#5741d8]"
            }`}
          >
            <Icon aria-hidden className="size-4" />
            {t(labelKey)}
          </button>
        );
      })}
    </div>
  );
}
