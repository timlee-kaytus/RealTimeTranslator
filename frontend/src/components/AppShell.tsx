"use client";

import Image from "next/image";
import { useState } from "react";
import { LogOut } from "lucide-react";

import { ModeSwitcher } from "@/components/ModeSwitcher";
import { PwaBootstrap } from "@/components/PwaBootstrap";
import { InterpreterMode } from "@/components/interpreter/InterpreterMode";
import { PresentationMode } from "@/components/presentation/PresentationMode";
import type { TranslationMode } from "@/lib/types/realtime";

export function AppShell() {
  const [mode, setMode] = useState<TranslationMode>("conversation");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  }

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
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <ModeSwitcher value={mode} onChange={setMode} />
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex min-h-11 self-start items-center justify-center gap-2 whitespace-nowrap rounded-[12px] border border-[#dedee5] bg-white px-4 text-sm font-bold text-[#4f5368] shadow-[rgba(16,24,40,0.04)_0px_1px_4px] transition hover:border-[#c7c3f5] hover:bg-[#f4f2ff] hover:text-[#5741d8] disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
            >
              <LogOut aria-hidden className="size-4" />
              {isLoggingOut ? "Logging Out..." : "Log Out"}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl">
        {mode === "conversation" ? <InterpreterMode /> : <PresentationMode />}
      </main>
    </div>
  );
}
