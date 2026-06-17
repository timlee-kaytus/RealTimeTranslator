"use client";

import { useState } from "react";

import { ModeSwitcher } from "@/components/ModeSwitcher";
import { PwaBootstrap } from "@/components/PwaBootstrap";
import { ConversationMode } from "@/components/conversation/ConversationMode";
import { PresentationMode } from "@/components/presentation/PresentationMode";
import type { TranslationMode } from "@/lib/types/realtime";

export function AppShell() {
  const [mode, setMode] = useState<TranslationMode>("conversation");

  return (
    <div className="min-h-dvh bg-[#f8f8fb] text-[#101114]">
      <PwaBootstrap />
      <header className="sticky top-0 z-20 border-b border-[#dedee5] bg-white/95 px-3 py-3 backdrop-blur md:px-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black leading-tight tracking-normal text-[#101114]">
              <span className="block">실시간 번역 자막기</span>
              <span className="block text-[#7132f5]">实时翻译字幕机</span>
            </h1>
          </div>
          <ModeSwitcher value={mode} onChange={setMode} />
        </div>
      </header>
      <main className="mx-auto max-w-7xl">
        {mode === "conversation" ? <ConversationMode /> : <PresentationMode />}
      </main>
    </div>
  );
}
