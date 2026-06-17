"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { PictureInPicture2 } from "lucide-react";

import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { BrowserSupportNotice } from "@/components/presentation/BrowserSupportNotice";
import type { SupportedLanguage } from "@/lib/types/language";
import type { FloatingCaptionSettings } from "@/lib/types/settings";
import { getPresentationSupport } from "@/lib/browser/featureDetection";

type FloatingCaptionLauncherProps = {
  text: string;
  language: SupportedLanguage;
  settings: FloatingCaptionSettings;
  fontSize: number;
  onSettingsChange: Dispatch<SetStateAction<FloatingCaptionSettings>>;
};

export function FloatingCaptionLauncher({
  text,
  language,
  settings,
  fontSize,
  onSettingsChange,
}: FloatingCaptionLauncherProps) {
  const support = useMemo(() => getPresentationSupport(), []);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function openFloatingCaption() {
    if (!window.documentPictureInPicture?.requestWindow) {
      return;
    }

    setErrorMessage("");

    try {
      const nextWindow = await window.documentPictureInPicture.requestWindow({
        width: settings.width,
        height: settings.height,
      });

      nextWindow.document.open();
      nextWindow.document.write(
        createFloatingCaptionMarkup(fontSize, settings.backgroundOpacity),
      );
      nextWindow.document.close();
      setPipWindow(nextWindow);
    } catch (error) {
      setErrorMessage(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "플로팅 창은 브라우저가 인정한 직접 클릭에서만 열 수 있습니다."
          : "플로팅 자막창을 열지 못했습니다.",
      );
    }
  }

  useEffect(() => {
    if (!pipWindow || pipWindow.closed) {
      return;
    }

    const document = pipWindow.document;
    const textElement = document.getElementById("caption-text");

    if (textElement) {
      textElement.textContent = text || "자막 대기 중";
      textElement.lang = language;
      textElement.style.fontSize = `${fontSize}px`;
    }

    applyFloatingCaptionBackground(
      document,
      settings.backgroundOpacity,
    );
  }, [fontSize, language, pipWindow, settings.backgroundOpacity, text]);

  useEffect(() => {
    if (!pipWindow || pipWindow.closed) {
      return;
    }

    const handlePageHide = () => setPipWindow(null);
    const handleResize = () => {
      onSettingsChange((current) => ({
        ...current,
        width: Math.max(360, Math.round(pipWindow.outerWidth)),
        height: Math.max(120, Math.round(pipWindow.outerHeight)),
      }));
    };

    pipWindow.addEventListener("pagehide", handlePageHide);
    pipWindow.addEventListener("resize", handleResize);

    return () => {
      pipWindow.removeEventListener("pagehide", handlePageHide);
      pipWindow.removeEventListener("resize", handleResize);
    };
  }, [onSettingsChange, pipWindow]);

  return (
    <div className="rtt-card space-y-3 p-4">
      {!support.supported && <BrowserSupportNotice />}
      <ErrorBanner message={errorMessage} />
      <div className="overflow-hidden rounded-[12px] border border-[#dedee5] bg-[rgba(148,151,169,0.08)]">
        <Image
          src="/images/presentation-caption-illustration.png"
          alt="발표 화면 위에 자막이 표시되는 일러스트"
          width={960}
          height={459}
          sizes="(min-width: 1024px) 360px, calc(100vw - 32px)"
          className="h-auto w-full"
        />
      </div>
      <button
        type="button"
        disabled={!support.supported}
        onClick={openFloatingCaption}
        className="rtt-outline-button inline-flex h-12 w-full items-center justify-center gap-2 px-4 text-sm disabled:cursor-not-allowed disabled:border-[#dedee5] disabled:bg-[#c4c6d1] disabled:text-white"
      >
        <PictureInPicture2 aria-hidden className="size-5" />
        {pipWindow && !pipWindow.closed ? "플로팅 갱신" : "플로팅 시작"}
      </button>
    </div>
  );
}

function createFloatingCaptionMarkup(
  fontSize: number,
  backgroundOpacity: number,
) {
  const backgroundColor = createFloatingBackgroundColor(backgroundOpacity);

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>실시간 번역 자막</title>
    <style>
      * { box-sizing: border-box; }
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        background: ${backgroundColor};
        color: #ffffff;
        font-family: Arial, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
      }
      body {
        display: flex;
        overflow: hidden;
      }
      .caption-area {
        display: flex;
        width: 100%;
        height: 100%;
        align-items: center;
        justify-content: center;
        padding: 16px 22px;
      }
      #caption-text {
        max-width: 100%;
        margin: 0;
        overflow-wrap: anywhere;
        text-align: center;
        font-size: ${fontSize}px;
        font-weight: 950;
        line-height: 1.14;
        text-shadow:
          0 2px 8px rgba(0, 0, 0, 0.95),
          0 0 18px rgba(0, 0, 0, 0.8);
      }
    </style>
  </head>
  <body>
    <main class="caption-area">
      <p id="caption-text">자막 대기 중</p>
    </main>
  </body>
</html>`;
}

function applyFloatingCaptionBackground(
  document: Document,
  backgroundOpacity: number,
) {
  const backgroundColor = createFloatingBackgroundColor(backgroundOpacity);

  document.documentElement.style.background = backgroundColor;
  document.body.style.background = backgroundColor;
}

function createFloatingBackgroundColor(backgroundOpacity: number) {
  const opacity = Math.min(0.85, Math.max(0.15, backgroundOpacity));

  return `rgba(9, 9, 11, ${opacity.toFixed(2)})`;
}
