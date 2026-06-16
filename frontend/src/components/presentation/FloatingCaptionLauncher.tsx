"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { PictureInPicture2 } from "lucide-react";

import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { BrowserSupportNotice } from "@/components/presentation/BrowserSupportNotice";
import { LANGUAGE_LABELS } from "@/lib/types/language";
import type { SupportedLanguage } from "@/lib/types/language";
import type { RealtimeConnectionStatus } from "@/lib/types/realtime";
import {
  FLOATING_CAPTION_PRESETS,
  type FloatingCaptionSettings,
} from "@/lib/types/settings";
import { getPresentationSupport } from "@/lib/browser/featureDetection";

type FloatingCaptionLauncherProps = {
  text: string;
  language: SupportedLanguage;
  status: RealtimeConnectionStatus;
  settings: FloatingCaptionSettings;
  onSettingsChange: Dispatch<SetStateAction<FloatingCaptionSettings>>;
};

export function FloatingCaptionLauncher({
  text,
  language,
  status,
  settings,
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
      nextWindow.document.write(createFloatingCaptionMarkup(settings));
      nextWindow.document.close();
      attachFloatingCaptionHandlers(nextWindow, onSettingsChange, () => {
        nextWindow.close();
        setPipWindow(null);
      });
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
    const titleElement = document.getElementById("caption-title");
    const languageElement = document.getElementById("caption-language");
    const statusElement = document.getElementById("caption-status");
    const textElement = document.getElementById("caption-text");

    if (titleElement) {
      titleElement.textContent = "실시간 번역 자막";
    }

    if (languageElement) {
      languageElement.textContent = LANGUAGE_LABELS[language];
    }

    if (statusElement) {
      statusElement.textContent = status === "translating" ? "번역 중" : "대기";
    }

    if (textElement) {
      textElement.textContent = text || "자막 대기 중";
      textElement.lang = language;
      textElement.style.fontSize = `${settings.fontSize}px`;
    }
  }, [language, pipWindow, settings.fontSize, status, text]);

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
    <div className="space-y-3 rounded-[8px] border border-zinc-200 bg-white p-4 shadow-sm">
      {!support.supported && <BrowserSupportNotice />}
      <ErrorBanner message={errorMessage} />
      <button
        type="button"
        disabled={!support.supported}
        onClick={openFloatingCaption}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-zinc-950 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        <PictureInPicture2 aria-hidden className="size-5" />
        {pipWindow && !pipWindow.closed ? "플로팅 갱신" : "플로팅 시작"}
      </button>
    </div>
  );
}

function createFloatingCaptionMarkup(settings: FloatingCaptionSettings) {
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
        background: #09090b;
        color: #ffffff;
        font-family: Arial, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
      }
      body {
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .chrome {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: 44px;
        padding: 8px 10px;
        border-bottom: 1px solid #27272a;
        background: #18181b;
      }
      .title {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 13px;
        font-weight: 800;
      }
      .meta {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #d4d4d8;
        font-size: 12px;
        font-weight: 800;
      }
      .controls {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      button {
        width: 34px;
        height: 30px;
        border: 1px solid #3f3f46;
        border-radius: 7px;
        background: #27272a;
        color: #ffffff;
        cursor: pointer;
        font: inherit;
        font-size: 12px;
        font-weight: 900;
      }
      button:hover {
        background: #3f3f46;
      }
      .caption-area {
        display: flex;
        min-height: 0;
        flex: 1;
        align-items: center;
        justify-content: center;
        padding: 18px 22px;
      }
      #caption-text {
        max-width: 100%;
        margin: 0;
        overflow-wrap: anywhere;
        text-align: center;
        font-size: ${settings.fontSize}px;
        font-weight: 950;
        line-height: 1.14;
      }
    </style>
  </head>
  <body>
    <div class="chrome">
      <div>
        <div class="title" id="caption-title">실시간 번역 자막</div>
        <div class="meta">
          <span id="caption-language">영어</span>
          <span id="caption-status">대기</span>
        </div>
      </div>
      <div class="controls">
        <button type="button" id="font-decrease" aria-label="글자 작게">A-</button>
        <button type="button" id="font-increase" aria-label="글자 크게">A+</button>
        <button type="button" id="preset-bottom" aria-label="하단바 크기">⛶</button>
        <button type="button" id="caption-close" aria-label="닫기">X</button>
      </div>
    </div>
    <main class="caption-area">
      <p id="caption-text">자막 대기 중</p>
    </main>
  </body>
</html>`;
}

function attachFloatingCaptionHandlers(
  pipWindow: Window,
  onSettingsChange: Dispatch<SetStateAction<FloatingCaptionSettings>>,
  onClose: () => void,
) {
  const document = pipWindow.document;

  document.getElementById("font-decrease")?.addEventListener("click", () => {
    onSettingsChange((current) => ({
      ...current,
      fontSize: Math.max(24, current.fontSize - 4),
    }));
  });

  document.getElementById("font-increase")?.addEventListener("click", () => {
    onSettingsChange((current) => ({
      ...current,
      fontSize: Math.min(88, current.fontSize + 4),
    }));
  });

  document.getElementById("preset-bottom")?.addEventListener("click", () => {
    onSettingsChange(FLOATING_CAPTION_PRESETS.bottom_bar);
  });

  document.getElementById("caption-close")?.addEventListener("click", onClose);
}
