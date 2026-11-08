"use client";

import {
  ReactPptxViewer,
  type ParsedPresentation,
  type PptxViewerController,
} from "@extend-ai/react-pptx";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  FileUp,
  Presentation,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type SetStateAction,
} from "react";

import {
  PptCaptionControls,
  type PptCaptionPosition,
} from "@/components/presentation/PptCaptionControls";
import { ErrorBanner } from "@/components/shared/ErrorBanner";
import { formatCaptionParagraphSpacing } from "@/lib/caption/captionSegmenter";
import {
  getLocalizedLanguageName,
  useUiLanguage,
} from "@/lib/i18n/uiLanguage";
import {
  DETECTED_LANGUAGE_PLACEHOLDERS,
  type SupportedLanguage,
} from "@/lib/types/language";
import type { FloatingCaptionSettings } from "@/lib/types/settings";

const MAX_PPT_FILE_SIZE = 100 * 1024 * 1024;
const PPT_FILE_EXTENSIONS = [".ppt", ".pptx"];
const DEFAULT_CAPTION_SIZE_RATIO = 0.24;
const MIN_CAPTION_SIZE_RATIO = 0.1;
const MAX_CAPTION_SIZE_RATIO = 0.55;
const MAX_DYNAMIC_CAPTION_LINES = 12;

type CaptionResizeSession = {
  pointerId: number;
  startX: number;
  startY: number;
  startRatio: number;
};

type PptModeWorkspaceProps = {
  controls: ReactNode;
  errorMessage: string;
  primaryLanguage: SupportedLanguage;
  primaryText: string;
  primaryFontSize: number;
  secondaryLanguage?: SupportedLanguage | null;
  secondaryText?: string;
  secondaryFontSize?: number;
  settings: FloatingCaptionSettings;
  onSettingsChange: Dispatch<SetStateAction<FloatingCaptionSettings>>;
};

export function PptModeWorkspace({
  controls,
  errorMessage,
  primaryLanguage,
  primaryText,
  primaryFontSize,
  secondaryLanguage = null,
  secondaryText = "",
  secondaryFontSize,
  settings,
  onSettingsChange,
}: PptModeWorkspaceProps) {
  const { t } = useUiLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const viewerControllerRef = useRef<PptxViewerController | null>(null);
  const captionResizeSessionRef = useRef<CaptionResizeSession | null>(null);
  const [presentationFile, setPresentationFile] = useState<File | null>(null);
  const [presentationError, setPresentationError] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideCount, setSlideCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [captionPosition, setCaptionPosition] =
    useState<PptCaptionPosition>("bottom");
  const [captionSizeRatio, setCaptionSizeRatio] = useState(
    DEFAULT_CAPTION_SIZE_RATIO,
  );

  const navigateToSlide = useCallback(
    async (direction: -1 | 1) => {
      const controller = viewerControllerRef.current;

      if (!controller || slideCount === 0) {
        return;
      }

      const nextSlide = Math.min(
        slideCount - 1,
        Math.max(0, currentSlide + direction),
      );

      if (nextSlide === currentSlide) {
        return;
      }

      await controller.goToSlide(nextSlide, { behavior: "auto" });
    },
    [currentSlide, slideCount],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        !presentationFile ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        isEditableKeyTarget(event.target)
      ) {
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        void navigateToSlide(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        void navigateToSlide(-1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigateToSlide, presentationFile]);

  useEffect(() => {
    function handleFullscreenChange() {
      const fullscreen = document.fullscreenElement === stageRef.current;
      setIsFullscreen(fullscreen);

      window.requestAnimationFrame(() => {
        void viewerControllerRef.current?.setZoom("fit-page");
      });
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      void viewerControllerRef.current?.setZoom("fit-page");
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [captionPosition, captionSizeRatio]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const extension = getFileExtension(file.name);

    if (!PPT_FILE_EXTENSIONS.includes(extension)) {
      setPresentationError(t("pptUnsupportedFile"));
      event.target.value = "";
      return;
    }

    if (file.size > MAX_PPT_FILE_SIZE) {
      setPresentationError(t("pptFileTooLarge"));
      event.target.value = "";
      return;
    }

    viewerControllerRef.current = null;
    setPresentationError("");
    setCurrentSlide(0);
    setSlideCount(0);
    setIsLoading(true);
    setPresentationFile(file);
  }

  function handlePresentationLoad(presentation: ParsedPresentation) {
    setSlideCount(presentation.document.slides.length);
    setCurrentSlide(0);
    setIsLoading(false);
    setPresentationError("");
  }

  async function enterFullscreen() {
    if (!stageRef.current || !presentationFile) {
      return;
    }

    setPresentationError("");

    try {
      await stageRef.current.requestFullscreen({ navigationUI: "hide" });
    } catch {
      setPresentationError(t("fullscreenFailed"));
    }
  }

  function startCaptionResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (!stageRef.current) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    captionResizeSessionRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRatio: captionSizeRatio,
    };
  }

  function resizeCaption(event: ReactPointerEvent<HTMLDivElement>) {
    const session = captionResizeSessionRef.current;
    const stage = stageRef.current;

    if (!session || session.pointerId !== event.pointerId || !stage) {
      return;
    }

    event.preventDefault();
    const stageRect = stage.getBoundingClientRect();
    const pointerDelta = getCaptionResizePointerDelta({
      position: captionPosition,
      deltaX: event.clientX - session.startX,
      deltaY: event.clientY - session.startY,
      stageWidth: stageRect.width,
      stageHeight: stageRect.height,
    });

    setCaptionSizeRatio(
      clampCaptionSizeRatio(session.startRatio + pointerDelta),
    );
  }

  function finishCaptionResize(event: ReactPointerEvent<HTMLDivElement>) {
    const session = captionResizeSessionRef.current;

    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    captionResizeSessionRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const fileIdentity = presentationFile
    ? `${presentationFile.name}-${presentationFile.size}-${presentationFile.lastModified}`
    : "no-presentation";
  const captionIsLeading =
    captionPosition === "top" || captionPosition === "left";
  const stageDirectionClass =
    captionPosition === "left" || captionPosition === "right"
      ? "flex-row"
      : "flex-col";
  const captionBand = (
    <PptCaptionBand
      position={captionPosition}
      sizeRatio={captionSizeRatio}
      primaryLanguage={primaryLanguage}
      primaryText={primaryText}
      primaryFontSize={primaryFontSize}
      secondaryLanguage={secondaryLanguage}
      secondaryText={secondaryText}
      secondaryFontSize={secondaryFontSize ?? primaryFontSize}
      backgroundOpacity={settings.backgroundOpacity}
    />
  );
  const captionResizeHandle = (
    <PptCaptionResizeHandle
      position={captionPosition}
      label={t("resizeCaptionArea")}
      onPointerDown={startCaptionResize}
      onPointerMove={resizeCaption}
      onPointerUp={finishCaptionResize}
      onPointerCancel={finishCaptionResize}
      onDoubleClick={() => setCaptionSizeRatio(DEFAULT_CAPTION_SIZE_RATIO)}
    />
  );

  return (
    <section className="grid min-h-[calc(100dvh-76px)] content-start gap-4 p-3 md:p-4">
      <div className="rtt-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {controls}
        </div>
        <ErrorBanner message={errorMessage} />
        <ErrorBanner message={presentationError} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <PptCaptionControls
          settings={settings}
          position={captionPosition}
          onSettingsChange={onSettingsChange}
          onPositionChange={setCaptionPosition}
        />

        <div className="rtt-card flex min-h-44 flex-col justify-between gap-4 p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#f4f2ff] text-[#7132f5]">
              <Presentation aria-hidden className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[#101114]">
                {presentationFile?.name ?? t("selectPptFile")}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#686b82]">
                {t("pptFileHint")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rtt-outline-button inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm"
          >
            <FileUp aria-hidden className="size-4" />
            {presentationFile ? t("changePptFile") : t("selectPptFile")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            onClick={(event) => {
              event.currentTarget.value = "";
            }}
            onChange={handleFileChange}
            className="sr-only"
          />
        </div>
      </div>

      <div className="rtt-card overflow-hidden p-3 md:p-4">
        {presentationFile ? (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[#101114]">
                  {presentationFile.name}
                </p>
                <p className="mt-1 text-xs text-[#686b82]">
                  {t("slideNavigationHint")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={t("previousSlide")}
                  title={t("previousSlide")}
                  disabled={currentSlide <= 0 || isLoading}
                  onClick={() => void navigateToSlide(-1)}
                  className="rtt-icon-button disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft aria-hidden className="size-5" />
                </button>
                <span className="min-w-16 text-center text-sm font-black tabular-nums text-[#4f5368]">
                  {slideCount > 0 ? `${currentSlide + 1} / ${slideCount}` : "- / -"}
                </span>
                <button
                  type="button"
                  aria-label={t("nextSlide")}
                  title={t("nextSlide")}
                  disabled={
                    currentSlide >= slideCount - 1 || slideCount === 0 || isLoading
                  }
                  onClick={() => void navigateToSlide(1)}
                  className="rtt-icon-button disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight aria-hidden className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => void enterFullscreen()}
                  disabled={isLoading || isFullscreen}
                  className="rtt-outline-button inline-flex min-h-11 items-center justify-center gap-2 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Expand aria-hidden className="size-4" />
                  <span className="hidden sm:inline">{t("enterPptFullscreen")}</span>
                </button>
              </div>
            </div>

            <div
              ref={stageRef}
              tabIndex={0}
              aria-label={t("pptMode")}
              className={`ppt-presentation-stage flex h-[clamp(360px,65vw,760px)] w-full overflow-hidden rounded-lg border border-[#2d2f39] bg-[#090a0e] ${stageDirectionClass}`}
            >
              {captionIsLeading && (
                <>
                  {captionBand}
                  {captionResizeHandle}
                </>
              )}
              <div className="ppt-slide-surface min-h-0 min-w-0 flex-1 overflow-hidden bg-[#090a0e]">
                <ReactPptxViewer
                  key={fileIdentity}
                  source={presentationFile}
                  mode="slide"
                  defaultZoom="fit-page"
                  showToolbar={false}
                  showThumbnails={false}
                  showNotes={false}
                  showDiagnostics={false}
                  showSlideLabels={false}
                  height="100%"
                  className="h-full w-full"
                  onReady={(controller) => {
                    viewerControllerRef.current = controller;
                  }}
                  onLoad={handlePresentationLoad}
                  onSlideChange={setCurrentSlide}
                  onError={() => {
                    setIsLoading(false);
                    setPresentationError(t("pptLoadFailed"));
                  }}
                  renderLoading={() => (
                    <div className="grid h-full min-h-72 place-items-center bg-[#111218] text-sm font-bold text-white/70">
                      {t("pptLoading")}
                    </div>
                  )}
                  renderError={() => (
                    <div className="grid h-full min-h-72 place-items-center bg-[#111218] px-6 text-center text-sm font-bold text-[#ffb4b4]">
                      {t("pptLoadFailed")}
                    </div>
                  )}
                />
              </div>
              {!captionIsLeading && (
                <>
                  {captionResizeHandle}
                  {captionBand}
                </>
              )}
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-80 w-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-[#b8b9c7] bg-[#fafafe] px-6 text-center transition hover:border-[#7132f5] hover:bg-[#f7f4ff]"
          >
            <span className="grid size-14 place-items-center rounded-full bg-[#eee9ff] text-[#7132f5]">
              <FileUp aria-hidden className="size-7" />
            </span>
            <span className="text-base font-black text-[#101114]">
              {t("selectPptFile")}
            </span>
            <span className="max-w-xl text-sm leading-6 text-[#686b82]">
              {t("pptFileHint")}
            </span>
          </button>
        )}
      </div>
    </section>
  );
}

type PptCaptionBandProps = {
  position: PptCaptionPosition;
  sizeRatio: number;
  primaryLanguage: SupportedLanguage;
  primaryText: string;
  primaryFontSize: number;
  secondaryLanguage: SupportedLanguage | null;
  secondaryText: string;
  secondaryFontSize: number;
  backgroundOpacity: number;
};

function PptCaptionBand({
  position,
  sizeRatio,
  primaryLanguage,
  primaryText,
  primaryFontSize,
  secondaryLanguage,
  secondaryText,
  secondaryFontSize,
  backgroundOpacity,
}: PptCaptionBandProps) {
  const { language: uiLanguage } = useUiLanguage();
  const bandRef = useRef<HTMLDivElement | null>(null);
  const [lineLimits, setLineLimits] = useState({ primary: 2, secondary: 2 });
  const sidePosition = position === "left" || position === "right";
  const positionClass = {
    top: "w-full border-b",
    bottom: "w-full border-t",
    left: "h-full border-r",
    right: "h-full border-l",
  }[position];

  useEffect(() => {
    const element = bandRef.current;

    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateLineLimits = () => {
      const computedStyle = window.getComputedStyle(element);
      const verticalPadding =
        parseFloat(computedStyle.paddingTop) +
        parseFloat(computedStyle.paddingBottom);
      const rowGap = secondaryLanguage
        ? parseFloat(computedStyle.rowGap || computedStyle.gap) || 0
        : 0;
      const rowCount = secondaryLanguage ? 2 : 1;
      const rowHeight = Math.max(
        0,
        (element.clientHeight - verticalPadding - rowGap) / rowCount,
      );

      setLineLimits({
        primary: getDynamicCaptionLineLimit(
          rowHeight,
          primaryFontSize,
          sidePosition,
        ),
        secondary: getDynamicCaptionLineLimit(
          rowHeight,
          secondaryFontSize,
          sidePosition,
        ),
      });
    };

    const resizeObserver = new ResizeObserver(updateLineLimits);
    resizeObserver.observe(element);
    updateLineLimits();

    return () => resizeObserver.disconnect();
  }, [
    primaryFontSize,
    secondaryFontSize,
    secondaryLanguage,
    sidePosition,
  ]);

  return (
    <div
      ref={bandRef}
      data-position={position}
      className={`ppt-caption-band grid shrink-0 gap-3 border-white/15 px-5 py-3 text-white md:px-7 ${positionClass}`}
      style={{
        backgroundColor: `rgba(12, 13, 18, ${backgroundOpacity})`,
        gridTemplateRows: secondaryLanguage ? "repeat(2, minmax(0, 1fr))" : "1fr",
        ...(sidePosition
          ? { width: `${sizeRatio * 100}%`, height: "100%" }
          : { width: "100%", height: `${sizeRatio * 100}%` }),
      }}
    >
      <PptCaptionLine
        language={primaryLanguage}
        languageLabel={getLocalizedLanguageName(primaryLanguage, uiLanguage)}
        text={primaryText}
        fontSize={primaryFontSize}
        sidePosition={sidePosition}
        maxLines={lineLimits.primary}
      />
      {secondaryLanguage && (
        <PptCaptionLine
          language={secondaryLanguage}
          languageLabel={getLocalizedLanguageName(secondaryLanguage, uiLanguage)}
          text={secondaryText}
          fontSize={secondaryFontSize}
          sidePosition={sidePosition}
          maxLines={lineLimits.secondary}
        />
      )}
    </div>
  );
}

type PptCaptionLineProps = {
  language: SupportedLanguage;
  languageLabel: string;
  text: string;
  fontSize: number;
  sidePosition: boolean;
  maxLines: number;
};

function PptCaptionLine({
  language,
  languageLabel,
  text,
  fontSize,
  sidePosition,
  maxLines,
}: PptCaptionLineProps) {
  const displayText = text
    ? formatCaptionParagraphSpacing(text, language)
    : DETECTED_LANGUAGE_PLACEHOLDERS[language];

  return (
    <div
      className={`grid min-w-0 gap-3 ${
        sidePosition
          ? "content-center items-start"
          : "grid-cols-[auto_minmax(0,1fr)] items-center"
      }`}
    >
      <span className="rounded-md bg-white/12 px-2 py-1 text-xs font-bold text-white/75">
        {languageLabel}
      </span>
      <p
        lang={language}
        className={`subtitle-text min-w-0 overflow-hidden font-black leading-tight [display:-webkit-box] [-webkit-box-orient:vertical] ${
          text ? "text-white" : "text-white/55"
        }`}
        style={{ fontSize, WebkitLineClamp: maxLines }}
      >
        {displayText}
      </p>
    </div>
  );
}

type PptCaptionResizeHandleProps = {
  position: PptCaptionPosition;
  label: string;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onDoubleClick: () => void;
};

function PptCaptionResizeHandle({
  position,
  label,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onDoubleClick,
}: PptCaptionResizeHandleProps) {
  const sidePosition = position === "left" || position === "right";

  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation={sidePosition ? "vertical" : "horizontal"}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onDoubleClick={onDoubleClick}
      className={`group relative z-10 grid shrink-0 touch-none select-none place-items-center bg-[#090a0e] ${
        sidePosition
          ? "h-full w-2 cursor-col-resize"
          : "h-2 w-full cursor-row-resize"
      }`}
    >
      <span
        aria-hidden
        className={`rounded-full bg-[#8b5cf6] opacity-0 transition-opacity group-hover:opacity-100 ${
          sidePosition ? "h-14 w-1" : "h-1 w-14"
        }`}
      />
    </div>
  );
}

type CaptionResizePointerDeltaOptions = {
  position: PptCaptionPosition;
  deltaX: number;
  deltaY: number;
  stageWidth: number;
  stageHeight: number;
};

function getCaptionResizePointerDelta({
  position,
  deltaX,
  deltaY,
  stageWidth,
  stageHeight,
}: CaptionResizePointerDeltaOptions): number {
  if (position === "top") {
    return stageHeight > 0 ? deltaY / stageHeight : 0;
  }

  if (position === "bottom") {
    return stageHeight > 0 ? -deltaY / stageHeight : 0;
  }

  if (position === "left") {
    return stageWidth > 0 ? deltaX / stageWidth : 0;
  }

  return stageWidth > 0 ? -deltaX / stageWidth : 0;
}

function clampCaptionSizeRatio(value: number): number {
  return Math.min(
    MAX_CAPTION_SIZE_RATIO,
    Math.max(MIN_CAPTION_SIZE_RATIO, value),
  );
}

function getDynamicCaptionLineLimit(
  rowHeight: number,
  fontSize: number,
  sidePosition: boolean,
): number {
  const languageLabelHeight = sidePosition ? 32 : 0;
  const availableTextHeight = Math.max(0, rowHeight - languageLabelHeight);
  const lineHeight = Math.max(1, fontSize * 1.2);

  return Math.max(
    1,
    Math.min(
      MAX_DYNAMIC_CAPTION_LINES,
      Math.floor(availableTextHeight / lineHeight),
    ),
  );
}

function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
}

function isEditableKeyTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLButtonElement
  );
}
