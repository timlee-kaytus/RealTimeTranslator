"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { PictureInPicture2 } from "lucide-react";

import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { BrowserSupportNotice } from "@/components/presentation/BrowserSupportNotice";
import { formatCaptionParagraphSpacing } from "@/lib/caption/captionSegmenter";
import {
  LANGUAGE_FLAG_LABELS,
  LANGUAGE_LABELS,
  type SupportedLanguage,
} from "@/lib/types/language";
import type { FloatingCaptionSettings } from "@/lib/types/settings";
import { getPresentationSupport } from "@/lib/browser/featureDetection";

type FloatingCaptionLauncherProps = {
  text: string;
  language: SupportedLanguage;
  secondaryText?: string;
  secondaryLanguage?: SupportedLanguage | null;
  settings: FloatingCaptionSettings;
  fontSize: number;
  secondaryFontSize?: number;
  onSettingsChange: Dispatch<SetStateAction<FloatingCaptionSettings>>;
};
type FloatingCaptionRole = "primary" | "secondary";
type FloatingCaptionLine = {
  id: string;
  text: string;
};
type FloatingCaptionHistory = Record<FloatingCaptionRole, FloatingCaptionLine[]>;

const FLOATING_CAPTION_HISTORY_LIMIT = 16;

export function FloatingCaptionLauncher({
  text,
  language,
  secondaryText = "",
  secondaryLanguage = null,
  settings,
  fontSize,
  secondaryFontSize,
  onSettingsChange,
}: FloatingCaptionLauncherProps) {
  const support = useMemo(() => getPresentationSupport(), []);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const captionHistoryRef = useRef<FloatingCaptionHistory>(
    createEmptyFloatingCaptionHistory(),
  );
  const captionLineIndexRef = useRef(0);
  const previousLanguagesRef = useRef<{
    primary: SupportedLanguage;
    secondary: SupportedLanguage | null;
  }>({
    primary: language,
    secondary: secondaryLanguage,
  });

  async function openFloatingCaption() {
    if (!window.documentPictureInPicture?.requestWindow) {
      return;
    }

    setErrorMessage("");

    try {
      const maxWidth =
        typeof window.screen?.availWidth === "number"
          ? window.screen.availWidth
          : settings.width;
      const maxHeight =
        typeof window.screen?.availHeight === "number"
          ? window.screen.availHeight
          : settings.height;
      const nextWindow = await window.documentPictureInPicture.requestWindow({
        width: Math.min(settings.width, maxWidth),
        height: Math.min(settings.height, maxHeight),
      });

      nextWindow.document.open();
      nextWindow.document.write(
        createFloatingCaptionMarkup(settings.backgroundOpacity),
      );
      nextWindow.document.close();
      syncFloatingCaptionDocument({
        document: nextWindow.document,
        history: captionHistoryRef.current,
        primaryLanguage: language,
        secondaryLanguage,
        fontSize,
        secondaryFontSize: secondaryFontSize ?? fontSize,
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
    resetFloatingCaptionHistoryOnLanguageChange({
      history: captionHistoryRef.current,
      previousLanguages: previousLanguagesRef.current,
      primaryLanguage: language,
      secondaryLanguage,
    });
    syncFloatingCaptionHistory({
      history: captionHistoryRef.current,
      role: "primary",
      text,
      language,
      nextLineId: () => {
        captionLineIndexRef.current += 1;
        return `primary-${captionLineIndexRef.current}`;
      },
    });
    syncFloatingCaptionHistory({
      history: captionHistoryRef.current,
      role: "secondary",
      text: secondaryText,
      language: secondaryLanguage,
      nextLineId: () => {
        captionLineIndexRef.current += 1;
        return `secondary-${captionLineIndexRef.current}`;
      },
    });

    syncFloatingCaptionDocument({
      document,
      history: captionHistoryRef.current,
      primaryLanguage: language,
      secondaryLanguage,
      fontSize,
      secondaryFontSize: secondaryFontSize ?? fontSize,
    });

    applyFloatingCaptionBackground(
      document,
      settings.backgroundOpacity,
    );
  }, [
    fontSize,
    language,
    pipWindow,
    secondaryFontSize,
    secondaryLanguage,
    secondaryText,
    settings.backgroundOpacity,
    text,
  ]);

  useEffect(() => {
    if (!pipWindow || pipWindow.closed) {
      return;
    }

    const handlePageHide = () => setPipWindow(null);
    const handleResize = () => {
      onSettingsChange((current) => ({
        ...current,
        width: Math.round(pipWindow.outerWidth),
        height: Math.round(pipWindow.outerHeight),
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
        {pipWindow && !pipWindow.closed
          ? "플로팅 갱신"
          : "플로팅 시작(开启悬浮窗)"}
      </button>
    </div>
  );
}

function createFloatingCaptionMarkup(backgroundOpacity: number) {
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
        flex-direction: column;
        gap: 12px;
        width: 100%;
        height: 100%;
        align-items: stretch;
        justify-content: flex-start;
        padding: 14px;
      }
      .caption-box {
        display: flex;
        flex: 1 1 0;
        min-height: 0;
        flex-direction: column;
        gap: 10px;
        border: 1px solid rgba(255, 255, 255, 0.24);
        border-radius: 14px;
        background: rgba(0, 0, 0, 0.28);
        box-shadow: 0 10px 32px rgba(0, 0, 0, 0.24);
        padding: 12px 14px;
      }
      .caption-box[hidden] {
        display: none;
      }
      .caption-label {
        flex: 0 0 auto;
        color: rgba(255, 255, 255, 0.78);
        font-size: 13px;
        font-weight: 850;
        line-height: 1;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.85);
      }
      .caption-list {
        display: flex;
        min-height: 0;
        flex: 1 1 auto;
        flex-direction: column;
        gap: 9px;
        overflow-y: auto;
        padding-right: 4px;
      }
      .caption-list::-webkit-scrollbar {
        width: 6px;
      }
      .caption-list::-webkit-scrollbar-thumb {
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.24);
      }
      .caption-line {
        max-width: 100%;
        margin: 0;
        overflow-wrap: anywhere;
        text-align: left;
        font-weight: 950;
        line-height: 1.18;
        text-shadow:
          0 2px 8px rgba(0, 0, 0, 0.95),
          0 0 18px rgba(0, 0, 0, 0.8);
      }
      .caption-line:first-child {
        color: #ffffff;
      }
      .caption-line:not(:first-child) {
        color: rgba(255, 255, 255, 0.78);
      }
      .caption-empty {
        margin: auto 0;
        color: rgba(255, 255, 255, 0.62);
        font-size: 18px;
        font-weight: 800;
        text-align: center;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.82);
      }
    </style>
  </head>
  <body>
    <main class="caption-area">
      <section id="caption-box-primary" class="caption-box">
        <div id="caption-label-primary" class="caption-label"></div>
        <div id="caption-list-primary" class="caption-list"></div>
      </section>
      <section id="caption-box-secondary" class="caption-box" hidden>
        <div id="caption-label-secondary" class="caption-label"></div>
        <div id="caption-list-secondary" class="caption-list"></div>
      </section>
    </main>
  </body>
</html>`;
}

function createEmptyFloatingCaptionHistory(): FloatingCaptionHistory {
  return {
    primary: [],
    secondary: [],
  };
}

function resetFloatingCaptionHistoryOnLanguageChange({
  history,
  previousLanguages,
  primaryLanguage,
  secondaryLanguage,
}: {
  history: FloatingCaptionHistory;
  previousLanguages: {
    primary: SupportedLanguage;
    secondary: SupportedLanguage | null;
  };
  primaryLanguage: SupportedLanguage;
  secondaryLanguage: SupportedLanguage | null;
}) {
  if (previousLanguages.primary !== primaryLanguage) {
    history.primary = [];
    previousLanguages.primary = primaryLanguage;
  }

  if (previousLanguages.secondary !== secondaryLanguage) {
    history.secondary = [];
    previousLanguages.secondary = secondaryLanguage;
  }

  if (secondaryLanguage === null) {
    history.secondary = [];
  }
}

function syncFloatingCaptionHistory({
  history,
  role,
  text,
  language,
  nextLineId,
}: {
  history: FloatingCaptionHistory;
  role: FloatingCaptionRole;
  text: string;
  language: SupportedLanguage | null;
  nextLineId: () => string;
}) {
  if (language === null) {
    history[role] = [];
    return;
  }

  const nextText = text
    ? formatCaptionParagraphSpacing(text, language).trim()
    : "";

  if (!nextText) {
    return;
  }

  const [latestLine] = history[role];

  if (!latestLine) {
    history[role] = [{ id: nextLineId(), text: nextText }];
    return;
  }

  if (latestLine.text === nextText) {
    return;
  }

  if (
    nextText.startsWith(latestLine.text) ||
    latestLine.text.startsWith(nextText)
  ) {
    history[role] = [
      {
        ...latestLine,
        text: nextText,
      },
      ...history[role].slice(1),
    ];
    return;
  }

  history[role] = [
    { id: nextLineId(), text: nextText },
    ...history[role],
  ].slice(0, FLOATING_CAPTION_HISTORY_LIMIT);
}

function syncFloatingCaptionDocument({
  document,
  history,
  primaryLanguage,
  secondaryLanguage,
  fontSize,
  secondaryFontSize,
}: {
  document: Document;
  history: FloatingCaptionHistory;
  primaryLanguage: SupportedLanguage;
  secondaryLanguage: SupportedLanguage | null;
  fontSize: number;
  secondaryFontSize: number;
}) {
  updateFloatingCaptionBox({
    document,
    boxId: "caption-box-primary",
    labelId: "caption-label-primary",
    listId: "caption-list-primary",
    label: `언어1 · ${LANGUAGE_FLAG_LABELS[primaryLanguage]} ${LANGUAGE_LABELS[primaryLanguage]}`,
    language: primaryLanguage,
    lines: history.primary,
    fontSize,
    visible: true,
  });
  updateFloatingCaptionBox({
    document,
    boxId: "caption-box-secondary",
    labelId: "caption-label-secondary",
    listId: "caption-list-secondary",
    label:
      secondaryLanguage === null
        ? ""
        : `언어2 · ${LANGUAGE_FLAG_LABELS[secondaryLanguage]} ${LANGUAGE_LABELS[secondaryLanguage]}`,
    language: secondaryLanguage,
    lines: history.secondary,
    fontSize: secondaryFontSize,
    visible: secondaryLanguage !== null,
  });
}

function updateFloatingCaptionBox({
  document,
  boxId,
  labelId,
  listId,
  label,
  language,
  lines,
  fontSize,
  visible,
}: {
  document: Document;
  boxId: string;
  labelId: string;
  listId: string;
  label: string;
  language: SupportedLanguage | null;
  lines: FloatingCaptionLine[];
  fontSize: number;
  visible: boolean;
}) {
  const boxElement = document.getElementById(boxId);
  const labelElement = document.getElementById(labelId);
  const listElement = document.getElementById(listId);

  if (!boxElement || !labelElement || !listElement) {
    return;
  }

  boxElement.toggleAttribute("hidden", !visible);
  labelElement.textContent = label;
  listElement.replaceChildren();

  if (!visible) {
    return;
  }

  if (lines.length === 0) {
    const emptyElement = document.createElement("p");
    emptyElement.className = "caption-empty";
    emptyElement.textContent = "자막 대기 중";
    listElement.append(emptyElement);
    return;
  }

  lines.forEach((line) => {
    const lineElement = document.createElement("p");
    lineElement.className = "caption-line";
    lineElement.dataset.lineId = line.id;
    lineElement.lang = language ?? "";
    lineElement.textContent = line.text;
    lineElement.style.fontSize = `${fontSize}px`;
    listElement.append(lineElement);
  });
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
