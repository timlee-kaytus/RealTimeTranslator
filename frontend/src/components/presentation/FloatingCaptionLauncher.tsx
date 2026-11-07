"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { MonitorUp, PictureInPicture2 } from "lucide-react";

import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { BrowserSupportNotice } from "@/components/presentation/BrowserSupportNotice";
import { formatCaptionParagraphSpacing } from "@/lib/caption/captionSegmenter";
import {
  LANGUAGE_FLAG_LABELS,
  type SupportedLanguage,
} from "@/lib/types/language";
import type { FloatingCaptionSettings } from "@/lib/types/settings";
import { getPresentationSupport } from "@/lib/browser/featureDetection";
import {
  getLocalizedLanguageName,
  useUiLanguage,
  type UiLanguage,
  type UiMessageKey,
} from "@/lib/i18n/uiLanguage";

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
type FloatingUiLabels = {
  language1: string;
  language2: string;
  captionWaiting: string;
};

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
  const { language: uiLanguage, t } = useUiLanguage();
  const support = useMemo(() => getPresentationSupport(), []);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [backdropWindow, setBackdropWindow] = useState<Window | null>(null);
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
        disallowReturnToOpener: true,
      });

      nextWindow.document.open();
      nextWindow.document.write(
        createFloatingCaptionMarkup(
          settings.backgroundOpacity,
          uiLanguage,
          t("appTitle"),
        ),
      );
      nextWindow.document.close();
      syncFloatingCaptionDocument({
        document: nextWindow.document,
        history: captionHistoryRef.current,
        primaryLanguage: language,
        secondaryLanguage,
        fontSize,
        secondaryFontSize: secondaryFontSize ?? fontSize,
        uiLanguage,
        labels: createFloatingUiLabels(t),
      });
      setPipWindow(nextWindow);
    } catch (error) {
      setErrorMessage(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? t("floatingDirectClickRequired")
          : t("floatingOpenFailed"),
      );
    }
  }

  function openPresentationBackdrop() {
    setErrorMessage("");

    if (backdropWindow && !backdropWindow.closed) {
      backdropWindow.focus();
      requestBackdropFullscreen(backdropWindow);
      return;
    }

    const availableWidth = window.screen?.availWidth ?? 1920;
    const availableHeight = window.screen?.availHeight ?? 1080;
    const nextWindow = window.open(
      "",
      "rtt-presentation-backdrop",
      [
        "popup=yes",
        "left=0",
        "top=0",
        `width=${availableWidth}`,
        `height=${availableHeight}`,
      ].join(","),
    );

    if (!nextWindow) {
      setErrorMessage(
        t("backdropPopupBlocked"),
      );
      return;
    }

    const imageUrl = new URL(
      "/images/presentation-fullscreen-backdrop.webp",
      window.location.origin,
    ).href;

    nextWindow.document.open();
    nextWindow.document.write(
      createPresentationBackdropMarkup({
        imageUrl,
        language: uiLanguage,
        title: t("appTitle"),
        fullscreenLabel: t("fullscreen"),
        viewFullscreenLabel: t("viewFullscreen"),
      }),
    );
    nextWindow.document.close();

    try {
      nextWindow.moveTo(0, 0);
      nextWindow.resizeTo(availableWidth, availableHeight);
    } catch {
      // Some browsers intentionally ignore scripted window placement.
    }

    attachBackdropFullscreenControl(nextWindow);
    setBackdropWindow(nextWindow);
    requestBackdropFullscreen(nextWindow);
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
      uiLanguage,
      labels: createFloatingUiLabels(t),
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
    t,
    uiLanguage,
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

  useEffect(() => {
    if (!backdropWindow || backdropWindow.closed) {
      return;
    }

    syncBackdropWindowLanguage(backdropWindow, {
      language: uiLanguage,
      title: t("appTitle"),
      fullscreenLabel: t("fullscreen"),
      viewFullscreenLabel: t("viewFullscreen"),
    });

    const handlePageHide = () => setBackdropWindow(null);
    backdropWindow.addEventListener("pagehide", handlePageHide);

    return () => {
      backdropWindow.removeEventListener("pagehide", handlePageHide);
    };
  }, [backdropWindow, t, uiLanguage]);

  return (
    <div className="rtt-card space-y-3 p-4">
      {!support.supported && <BrowserSupportNotice />}
      <ErrorBanner message={errorMessage} />
      <div className="overflow-hidden rounded-[12px] border border-[#dedee5] bg-[rgba(148,151,169,0.08)]">
        <Image
          src="/images/presentation-caption-illustration.png"
          alt={t("presentationIllustrationAlt")}
          width={960}
          height={459}
          sizes="(min-width: 1024px) 360px, calc(100vw - 32px)"
          className="h-auto w-full"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!support.supported}
          onClick={openFloatingCaption}
          className="rtt-outline-button inline-flex min-h-14 w-full items-center justify-center gap-2 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:border-[#dedee5] disabled:bg-[#c4c6d1] disabled:text-white"
        >
          <PictureInPicture2 aria-hidden className="size-5 shrink-0" />
          <span className="leading-tight">
            {pipWindow && !pipWindow.closed
              ? t("floatingRefresh")
              : t("floatingStart")}
          </span>
        </button>
        <button
          type="button"
          onClick={openPresentationBackdrop}
          className="rtt-outline-button inline-flex min-h-14 w-full items-center justify-center gap-2 px-3 py-2 text-sm"
        >
          <MonitorUp aria-hidden className="size-5 shrink-0" />
          <span className="leading-tight">
            {backdropWindow && !backdropWindow.closed
              ? t("presentationBackdropView")
              : t("presentationBackdropOpen")}
          </span>
        </button>
      </div>
    </div>
  );
}

function createPresentationBackdropMarkup({
  imageUrl,
  language,
  title,
  fullscreenLabel,
  viewFullscreenLabel,
}: {
  imageUrl: string;
  language: UiLanguage;
  title: string;
  fullscreenLabel: string;
  viewFullscreenLabel: string;
}) {
  return `<!doctype html>
<html lang="${language}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      * { box-sizing: border-box; }
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: #000000;
      }
      body {
        background-image: url("${imageUrl}");
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
      }
      .fullscreen-control {
        position: fixed;
        top: 18px;
        right: 18px;
        display: grid;
        width: 44px;
        height: 44px;
        place-items: center;
        border: 1px solid rgba(255, 255, 255, 0.35);
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.68);
        color: #ffffff;
        cursor: pointer;
        font: 700 24px/1 Arial, sans-serif;
        opacity: 0;
        transition: opacity 160ms ease, background-color 160ms ease;
      }
      body:hover .fullscreen-control,
      .fullscreen-control:focus-visible,
      .fullscreen-control[data-visible="true"] {
        opacity: 1;
      }
      .fullscreen-control:hover {
        background: rgba(113, 50, 245, 0.88);
      }
      .fullscreen-control:focus-visible {
        outline: 2px solid #8f63ff;
        outline-offset: 3px;
      }
    </style>
  </head>
  <body>
    <button
      id="fullscreen-control"
      class="fullscreen-control"
      type="button"
      aria-label="${viewFullscreenLabel}"
      title="${fullscreenLabel}"
    >&#x26F6;</button>
  </body>
</html>`;
}

function attachBackdropFullscreenControl(targetWindow: Window) {
  const control = targetWindow.document.getElementById(
    "fullscreen-control",
  ) as HTMLButtonElement | null;

  control?.addEventListener("click", () => {
    requestBackdropFullscreen(targetWindow);
  });
}

function requestBackdropFullscreen(targetWindow: Window) {
  const { document } = targetWindow;
  const control = document.getElementById("fullscreen-control");

  if (document.fullscreenElement) {
    return;
  }

  const requestFullscreen = document.documentElement.requestFullscreen;

  if (typeof requestFullscreen !== "function") {
    control?.setAttribute("data-visible", "true");
    return;
  }

  try {
    void requestFullscreen.call(document.documentElement).catch(() => {
      control?.setAttribute("data-visible", "true");
    });
  } catch {
    control?.setAttribute("data-visible", "true");
  }
}

function syncBackdropWindowLanguage(
  targetWindow: Window,
  {
    language,
    title,
    fullscreenLabel,
    viewFullscreenLabel,
  }: {
    language: UiLanguage;
    title: string;
    fullscreenLabel: string;
    viewFullscreenLabel: string;
  },
) {
  const { document } = targetWindow;
  document.documentElement.lang = language;
  document.title = title;
  const fullscreenControl = document.getElementById("fullscreen-control");
  fullscreenControl?.setAttribute("aria-label", viewFullscreenLabel);
  fullscreenControl?.setAttribute("title", fullscreenLabel);
}

function createFloatingCaptionMarkup(
  backgroundOpacity: number,
  language: UiLanguage,
  title: string,
) {
  const backgroundColor = createFloatingBackgroundColor(backgroundOpacity);

  return `<!doctype html>
<html lang="${language}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
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
  uiLanguage,
  labels,
}: {
  document: Document;
  history: FloatingCaptionHistory;
  primaryLanguage: SupportedLanguage;
  secondaryLanguage: SupportedLanguage | null;
  fontSize: number;
  secondaryFontSize: number;
  uiLanguage: UiLanguage;
  labels: FloatingUiLabels;
}) {
  document.documentElement.lang = uiLanguage;
  updateFloatingCaptionBox({
    document,
    boxId: "caption-box-primary",
    labelId: "caption-label-primary",
    listId: "caption-list-primary",
    label: `${labels.language1} · ${LANGUAGE_FLAG_LABELS[primaryLanguage]} ${getLocalizedLanguageName(primaryLanguage, uiLanguage)}`,
    language: primaryLanguage,
    lines: history.primary,
    fontSize,
    visible: true,
    emptyText: labels.captionWaiting,
  });
  updateFloatingCaptionBox({
    document,
    boxId: "caption-box-secondary",
    labelId: "caption-label-secondary",
    listId: "caption-list-secondary",
    label:
      secondaryLanguage === null
        ? ""
        : `${labels.language2} · ${LANGUAGE_FLAG_LABELS[secondaryLanguage]} ${getLocalizedLanguageName(secondaryLanguage, uiLanguage)}`,
    language: secondaryLanguage,
    lines: history.secondary,
    fontSize: secondaryFontSize,
    visible: secondaryLanguage !== null,
    emptyText: labels.captionWaiting,
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
  emptyText,
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
  emptyText: string;
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
    emptyElement.textContent = emptyText;
    emptyElement.style.fontSize = `${fontSize}px`;
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

function createFloatingUiLabels(
  t: (key: UiMessageKey) => string,
): FloatingUiLabels {
  return {
    language1: t("language1"),
    language2: t("language2"),
    captionWaiting: t("captionWaiting"),
  };
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
