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
  type ReactNode,
  type SetStateAction,
} from "react";

import { CaptionSizeControls } from "@/components/presentation/CaptionSizeControls";
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
  const [presentationFile, setPresentationFile] = useState<File | null>(null);
  const [presentationError, setPresentationError] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideCount, setSlideCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const fileIdentity = presentationFile
    ? `${presentationFile.name}-${presentationFile.size}-${presentationFile.lastModified}`
    : "no-presentation";

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
        <CaptionSizeControls
          settings={settings}
          onSettingsChange={onSettingsChange}
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
              className="ppt-presentation-stage flex h-[clamp(360px,65vw,760px)] w-full flex-col overflow-hidden rounded-lg border border-[#2d2f39] bg-[#090a0e]"
            >
              <div className="ppt-slide-surface min-h-0 flex-1 overflow-hidden bg-[#090a0e]">
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

              <PptCaptionBand
                primaryLanguage={primaryLanguage}
                primaryText={primaryText}
                primaryFontSize={primaryFontSize}
                secondaryLanguage={secondaryLanguage}
                secondaryText={secondaryText}
                secondaryFontSize={secondaryFontSize ?? primaryFontSize}
                backgroundOpacity={settings.backgroundOpacity}
              />
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
  primaryLanguage: SupportedLanguage;
  primaryText: string;
  primaryFontSize: number;
  secondaryLanguage: SupportedLanguage | null;
  secondaryText: string;
  secondaryFontSize: number;
  backgroundOpacity: number;
};

function PptCaptionBand({
  primaryLanguage,
  primaryText,
  primaryFontSize,
  secondaryLanguage,
  secondaryText,
  secondaryFontSize,
  backgroundOpacity,
}: PptCaptionBandProps) {
  const { language: uiLanguage } = useUiLanguage();

  return (
    <div
      className="ppt-caption-band grid shrink-0 gap-2 border-t border-white/15 px-5 py-3 text-white md:px-7"
      style={{
        backgroundColor: `rgba(12, 13, 18, ${backgroundOpacity})`,
        gridTemplateRows: secondaryLanguage ? "repeat(2, minmax(0, 1fr))" : "1fr",
      }}
    >
      <PptCaptionLine
        language={primaryLanguage}
        languageLabel={getLocalizedLanguageName(primaryLanguage, uiLanguage)}
        text={primaryText}
        fontSize={primaryFontSize}
      />
      {secondaryLanguage && (
        <PptCaptionLine
          language={secondaryLanguage}
          languageLabel={getLocalizedLanguageName(secondaryLanguage, uiLanguage)}
          text={secondaryText}
          fontSize={secondaryFontSize}
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
};

function PptCaptionLine({
  language,
  languageLabel,
  text,
  fontSize,
}: PptCaptionLineProps) {
  const displayText = text
    ? formatCaptionParagraphSpacing(text, language)
    : DETECTED_LANGUAGE_PLACEHOLDERS[language];

  return (
    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
      <span className="rounded-md bg-white/12 px-2 py-1 text-xs font-bold text-white/75">
        {languageLabel}
      </span>
      <p
        lang={language}
        className={`subtitle-text min-w-0 truncate font-black leading-tight ${
          text ? "text-white" : "text-white/55"
        }`}
        style={{ fontSize }}
      >
        {displayText}
      </p>
    </div>
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
