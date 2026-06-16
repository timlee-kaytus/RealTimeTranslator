import {
  DEFAULT_FLOATING_CAPTION_SETTINGS,
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
        fontSize: parsedValue.fontSize,
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

