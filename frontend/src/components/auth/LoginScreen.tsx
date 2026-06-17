"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";

export function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password) {
      setErrorMessage("비밀번호를 입력해 주세요.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        setErrorMessage(
          response.status === 500
            ? "로그인 설정을 확인해 주세요."
            : "비밀번호가 올바르지 않습니다.",
        );
        return;
      }

      window.location.href = "/";
    } catch {
      setErrorMessage("로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-dvh grid-cols-1 bg-[#fafafc] text-[#1b1d25] lg:grid-cols-2">
      <section className="relative min-h-[560px] overflow-hidden bg-[linear-gradient(145deg,#f8fbff_0%,#eef7f6_46%,#f4f1ff_100%)] px-8 py-10 sm:px-12 lg:min-h-dvh lg:px-16 lg:py-14">
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
              value={password}
              disabled={loading}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호 입력"
              aria-label="비밀번호 입력"
              className="min-w-0 flex-1 border-0 bg-transparent text-lg font-semibold text-[#1b1d25] outline-none placeholder:text-[#a1a6b8] disabled:cursor-not-allowed"
            />
            <button
              type="button"
              disabled={loading}
              aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
              onClick={() => setShowPassword((current) => !current)}
              className="grid size-11 shrink-0 place-items-center rounded-full text-[#9a9fb2] transition hover:bg-[#f3f0fa] hover:text-[#613bff] focus:outline-none focus:ring-4 focus:ring-[rgba(141,116,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {showPassword ? (
                <EyeOff aria-hidden className="size-6" />
              ) : (
                <Eye aria-hidden className="size-6" />
              )}
            </button>
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="mt-4 text-sm font-bold text-[#dc2626]"
            >
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-9 h-[82px] w-full rounded-[18px] bg-[linear-gradient(90deg,#613bff_0%,#5a35f0_100%)] text-[22px] font-bold text-white shadow-[0_18px_32px_rgba(97,59,255,0.22)] transition hover:brightness-105 focus:outline-none focus:ring-4 focus:ring-[rgba(141,116,255,0.28)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "확인 중..." : "로그인"}
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
    <div className="relative mx-auto flex h-full min-h-[520px] max-w-[780px] items-center justify-center pt-20 lg:min-h-[calc(100dvh-112px)]">
      <div className="absolute inset-x-2 bottom-[9%] h-28 rounded-[100%] bg-[radial-gradient(circle,rgba(28,107,118,0.18)_0%,rgba(28,107,118,0)_68%)]" />
      <div className="relative w-full max-w-[720px]">
        <div className="absolute -inset-4 rounded-[36px] bg-white/58 shadow-[0_34px_86px_rgba(23,32,52,0.14)] backdrop-blur-xl" />
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-[28px] border border-white/70 bg-white/56 shadow-[0_20px_48px_rgba(63,86,116,0.12)] backdrop-blur-md" />
        <div className="absolute -bottom-7 left-8 h-14 w-[34%] rounded-full bg-[#0f2f3d]/10 blur-xl" />
        <div className="relative overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_28px_70px_rgba(23,32,52,0.16)]">
          <Image
            src="/images/login-ai-translation-hero.png"
            alt="AI 실시간 번역 대화를 표현한 로그인 일러스트"
            width={1400}
            height={788}
            priority
            sizes="(min-width: 1024px) 46vw, 92vw"
            className="h-auto w-full"
          />
        </div>
      </div>
    </div>
  );
}
