"use client";

import Image from "next/image";
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
      <header className="sticky top-0 z-20 border-b border-[#dedee5] bg-white/95 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-3 md:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/images/conversation-logo-illustration.png"
              alt="서로 다른 언어로 대화하는 두 사람"
              width={96}
              height={54}
              priority
              className="aspect-video h-10 w-auto shrink-0 rounded-lg border border-[#dedee5] object-cover shadow-[0_1px_4px_rgba(16,24,40,0.04)] sm:h-12"
            />
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
