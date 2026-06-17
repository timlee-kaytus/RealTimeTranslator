"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";

export function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <main className="grid min-h-dvh grid-cols-1 bg-[#fafafc] text-[#1b1d25] lg:grid-cols-2">
      <section className="relative min-h-[560px] overflow-hidden bg-[linear-gradient(180deg,#f4f1fb_0%,#f0edf8_100%)] px-8 py-10 sm:px-12 lg:min-h-dvh lg:px-16 lg:py-14">
        <RTTLogo />
        <LoginHeroVisual />
      </section>

      <section className="flex min-h-[560px] items-center justify-center px-6 py-12 sm:px-10 lg:min-h-dvh">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-[620px] rounded-[28px] bg-white px-8 py-12 shadow-[0_20px_60px_rgba(28,30,40,0.06)] sm:min-h-[560px] sm:px-16 sm:py-16 lg:min-h-[620px] lg:px-[72px] lg:py-[72px]"
        >
          <h1 className="text-[44px] font-black leading-none tracking-normal text-[#1b1d25] sm:text-[54px]">
            로그인
          </h1>

          <div className="mt-12 flex h-[76px] items-center gap-4 rounded-[18px] border border-[#d9dde8] bg-white px-6 transition focus-within:border-[#613bff] focus-within:shadow-[0_0_0_4px_rgba(141,116,255,0.18)]">
            <LockKeyhole aria-hidden className="size-6 shrink-0 text-[#9a9fb2]" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="비밀번호 입력"
              aria-label="비밀번호 입력"
              className="min-w-0 flex-1 border-0 bg-transparent text-lg font-semibold text-[#1b1d25] outline-none placeholder:text-[#a1a6b8]"
            />
            <button
              type="button"
              aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
              onClick={() => setShowPassword((current) => !current)}
              className="grid size-11 shrink-0 place-items-center rounded-full text-[#9a9fb2] transition hover:bg-[#f3f0fa] hover:text-[#613bff] focus:outline-none focus:ring-4 focus:ring-[rgba(141,116,255,0.18)]"
            >
              {showPassword ? (
                <EyeOff aria-hidden className="size-6" />
              ) : (
                <Eye aria-hidden className="size-6" />
              )}
            </button>
          </div>

          <button
            type="submit"
            className="mt-9 h-[82px] w-full rounded-[18px] bg-[linear-gradient(90deg,#613bff_0%,#5a35f0_100%)] text-[22px] font-bold text-white shadow-[0_18px_32px_rgba(97,59,255,0.22)] transition hover:brightness-105 focus:outline-none focus:ring-4 focus:ring-[rgba(141,116,255,0.28)] active:translate-y-px"
          >
            로그인
          </button>
        </form>
      </section>
    </main>
  );
}

function RTTLogo() {
  return (
    <div className="absolute left-8 top-8 z-10 flex items-center gap-3 sm:left-12 sm:top-12 lg:left-16 lg:top-14">
      <div
        aria-hidden
        className="relative grid size-11 place-items-center rounded-[14px] bg-white shadow-[0_12px_28px_rgba(97,59,255,0.12)]"
      >
        <span className="absolute bottom-3 left-2.5 h-5 w-2 rounded-t-full bg-[#613bff]" />
        <span className="absolute bottom-3 left-[18px] h-7 w-2 rounded-t-full bg-[#7a5cff]" />
        <span className="absolute bottom-3 right-2.5 h-5 w-2 rounded-t-full bg-[#9d8cff]" />
      </div>
      <span className="text-[26px] font-black tracking-normal text-[#1b1d25]">
        RTT
      </span>
    </div>
  );
}

function LoginHeroVisual() {
  return (
    <div className="relative mx-auto flex h-full min-h-[520px] max-w-[760px] items-center justify-center pt-16 lg:min-h-[calc(100dvh-112px)]">
      <div className="absolute inset-x-4 bottom-10 h-20 rounded-[100%] bg-[radial-gradient(circle,rgba(141,116,255,0.13)_0%,rgba(141,116,255,0)_68%)]" />
      <SpeechBubble className="left-[8%] top-[20%]" tail="left">
        안녕하세요
      </SpeechBubble>
      <SpeechBubble className="right-[12%] top-[22%]" tail="right">
        你好
      </SpeechBubble>

      <div className="absolute left-[19%] top-[52%] h-[2px] w-[25%] -translate-y-1/2 bg-[linear-gradient(90deg,rgba(141,116,255,0),rgba(141,116,255,0.52),rgba(141,116,255,0))]" />
      <div className="absolute right-[19%] top-[52%] h-[2px] w-[25%] -translate-y-1/2 bg-[linear-gradient(90deg,rgba(141,116,255,0),rgba(141,116,255,0.52),rgba(141,116,255,0))]" />

      <div className="absolute left-[24%] top-[49%] flex gap-2 opacity-75">
        <span className="h-3 w-1 rounded-full bg-[#9d8cff]" />
        <span className="h-6 w-1 rounded-full bg-[#8d74ff]" />
        <span className="h-4 w-1 rounded-full bg-[#c8bfff]" />
        <span className="h-7 w-1 rounded-full bg-[#8d74ff]" />
        <span className="h-3 w-1 rounded-full bg-[#9d8cff]" />
      </div>
      <div className="absolute right-[24%] top-[49%] flex gap-2 opacity-75">
        <span className="h-4 w-1 rounded-full bg-[#9d8cff]" />
        <span className="h-7 w-1 rounded-full bg-[#8d74ff]" />
        <span className="h-3 w-1 rounded-full bg-[#c8bfff]" />
        <span className="h-6 w-1 rounded-full bg-[#8d74ff]" />
        <span className="h-4 w-1 rounded-full bg-[#9d8cff]" />
      </div>

      <div className="absolute left-[49%] top-[50%] z-20 grid size-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#613bff] text-2xl font-black text-white shadow-[0_0_0_18px_rgba(141,116,255,0.12),0_0_60px_rgba(97,59,255,0.38)] sm:size-28">
        AI
      </div>
      <span className="absolute left-[44%] top-[38%] size-2 rounded-full bg-[#8d74ff] opacity-70" />
      <span className="absolute left-[56%] top-[41%] size-1.5 rounded-full bg-[#c8bfff] opacity-80" />
      <span className="absolute left-[52%] top-[63%] size-2 rounded-full bg-[#9d8cff] opacity-60" />

      <IllustratedPerson variant="woman" className="left-[7%] bottom-[12%]" />
      <IllustratedPerson variant="man" className="right-[8%] bottom-[12%]" />
    </div>
  );
}

type SpeechBubbleProps = {
  children: string;
  className: string;
  tail: "left" | "right";
};

function SpeechBubble({ children, className, tail }: SpeechBubbleProps) {
  return (
    <div
      className={`absolute z-20 rounded-[24px] bg-white px-7 py-4 text-xl font-black text-[#613bff] shadow-[0_14px_36px_rgba(28,30,40,0.08)] ${className}`}
    >
      {children}
      <span
        aria-hidden
        className={`absolute bottom-[-8px] size-5 rotate-45 bg-white ${
          tail === "left" ? "left-9" : "right-9"
        }`}
      />
    </div>
  );
}

type IllustratedPersonProps = {
  variant: "woman" | "man";
  className: string;
};

function IllustratedPerson({ variant, className }: IllustratedPersonProps) {
  const isWoman = variant === "woman";

  return (
    <div className={`absolute z-10 h-[300px] w-[210px] sm:h-[360px] sm:w-[250px] ${className}`}>
      <div
        className={`absolute left-1/2 top-6 size-[96px] -translate-x-1/2 rounded-full bg-[#ffd7bf] shadow-[inset_0_-10px_0_rgba(200,110,80,0.08)] sm:size-[112px] ${
          isWoman ? "" : "top-8"
        }`}
      />
      <div
        className={`absolute left-1/2 z-10 -translate-x-1/2 rounded-full bg-[#1f2738] ${
          isWoman
            ? "top-0 h-[130px] w-[124px] rounded-b-[54px]"
            : "top-3 h-[66px] w-[124px] rounded-b-[26px]"
        }`}
      />
      {isWoman && (
        <div className="absolute left-5 top-20 h-[148px] w-11 rounded-full bg-[#1f2738]" />
      )}
      <div
        className={`absolute left-1/2 top-[132px] h-[150px] w-[154px] -translate-x-1/2 rounded-t-[44px] sm:top-[154px] sm:h-[178px] sm:w-[182px] ${
          isWoman ? "bg-[#fffdf8]" : "bg-[#dcd6ff]"
        }`}
      />
      <div
        className={`absolute left-1/2 top-[128px] h-[158px] w-[180px] -translate-x-1/2 rounded-t-[52px] sm:top-[150px] sm:h-[190px] sm:w-[214px] ${
          isWoman
            ? "bg-[linear-gradient(135deg,#ffffff_0%,#f4eee8_100%)]"
            : "bg-[linear-gradient(135deg,#e9e5ff_0%,#cfc6ff_100%)]"
        }`}
      />
      <div
        className={`absolute top-[166px] h-16 w-24 rounded-full bg-[#ffd7bf] sm:top-[196px] ${
          isWoman
            ? "right-0 rotate-[24deg]"
            : "left-[-8px] -rotate-[22deg]"
        }`}
      />
      <div
        className={`absolute top-[174px] h-14 w-20 rounded-full sm:top-[206px] ${
          isWoman
            ? "right-[-12px] rotate-[24deg] bg-[#f8f4ef]"
            : "left-[-20px] -rotate-[22deg] bg-[#d7d0ff]"
        }`}
      />
      <div className="absolute bottom-0 left-1/2 h-24 w-[210px] -translate-x-1/2 bg-[linear-gradient(180deg,rgba(244,241,251,0)_0%,#f2eff9_72%)]" />
    </div>
  );
}
