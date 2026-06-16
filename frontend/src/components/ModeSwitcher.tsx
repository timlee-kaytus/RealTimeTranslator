"use client";

import { MessagesSquare, Presentation } from "lucide-react";

import type { TranslationMode } from "@/lib/types/realtime";

type ModeSwitcherProps = {
  value: TranslationMode;
  onChange: (mode: TranslationMode) => void;
};

const modes = [
  {
    value: "conversation" as const,
    label: "대화 모드",
    Icon: MessagesSquare,
  },
  {
    value: "presentation" as const,
    label: "발표 모드",
    Icon: Presentation,
  },
];

export function ModeSwitcher({ value, onChange }: ModeSwitcherProps) {
  return (
    <div className="grid h-11 grid-cols-2 rounded-[8px] border border-zinc-300 bg-zinc-100 p-1">
      {modes.map(({ value: mode, label, Icon }) => {
        const selected = value === mode;

        return (
          <button
            key={mode}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(mode)}
            className={`inline-flex min-w-32 items-center justify-center gap-2 rounded-[6px] px-3 text-sm font-bold transition ${
              selected
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            <Icon aria-hidden className="size-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

