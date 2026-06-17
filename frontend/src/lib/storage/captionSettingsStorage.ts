import {
  DEFAULT_FLOATING_CAPTION_SETTINGS,
  FLOATING_CAPTION_FONT_SIZE_MAX,
  FLOATING_CAPTION_FONT_SIZE_MIN,
  type FloatingCaptionSettings,
} from "@/lib/types/settings";

export const FLOATING_CAPTION_SETTINGS_KEY =
  "kaytus-translator:floating-caption-settings";

export function loadFloatingCaptionSettings(): FloatingCaptionSettings {
  if (typeof window === "undefined") {
    return DEFAULT_FLOATING_CAPTION_SETTINGS;
  }

  const rawValue = window.localStorage.getItem(FLOATING_CAPTION_SETTINGS_KEY);

  if (!rawValue) {
    return DEFAULT_FLOATING_CAPTION_SETTINGS;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as FloatingCaptionSettings;

    if (
      typeof parsedValue.width === "number" &&
      typeof parsedValue.height === "number" &&
      typeof parsedValue.fontSize === "number"
    ) {
      return {
        preset: parsedValue.preset ?? DEFAULT_FLOATING_CAPTION_SETTINGS.preset,
        width: parsedValue.width,
        height: parsedValue.height,
        fontSize: clampFontSize(parsedValue.fontSize),
        backgroundOpacity:
          typeof parsedValue.backgroundOpacity === "number"
            ? clampBackgroundOpacity(parsedValue.backgroundOpacity)
            : DEFAULT_FLOATING_CAPTION_SETTINGS.backgroundOpacity,
      };
    }
  } catch {
    window.localStorage.removeItem(FLOATING_CAPTION_SETTINGS_KEY);
  }

  return DEFAULT_FLOATING_CAPTION_SETTINGS;
}

export function saveFloatingCaptionSettings(
  settings: FloatingCaptionSettings,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    FLOATING_CAPTION_SETTINGS_KEY,
    JSON.stringify(settings),
  );
}

function clampBackgroundOpacity(value: number): number {
  return Math.min(0.85, Math.max(0.15, value));
}

function clampFontSize(value: number): number {
  return Math.min(
    FLOATING_CAPTION_FONT_SIZE_MAX,
    Math.max(FLOATING_CAPTION_FONT_SIZE_MIN, value),
  );
}
