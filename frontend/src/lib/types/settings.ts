export type FloatingPreset = "small" | "medium" | "large" | "bottom_bar";

export type FloatingCaptionSettings = {
  settingsVersion: number;
  preset: FloatingPreset;
  width: number;
  height: number;
  fontSize: number;
  backgroundOpacity: number;
};

export const FLOATING_CAPTION_FONT_SIZE_MIN = 1;
export const FLOATING_CAPTION_FONT_SIZE_MAX = 88;
export const FLOATING_CAPTION_SETTINGS_VERSION = 2;
export const DEFAULT_FLOATING_CAPTION_FONT_SIZE = 30;
export const DEFAULT_FLOATING_CAPTION_TRANSPARENCY_PERCENT = 30;
export const DEFAULT_FLOATING_CAPTION_BACKGROUND_OPACITY =
  1 - DEFAULT_FLOATING_CAPTION_TRANSPARENCY_PERCENT / 100;

export const FLOATING_CAPTION_PRESETS: Record<
  FloatingPreset,
  FloatingCaptionSettings
> = {
  small: {
    settingsVersion: FLOATING_CAPTION_SETTINGS_VERSION,
    preset: "small",
    width: 520,
    height: 160,
    fontSize: 30,
    backgroundOpacity: DEFAULT_FLOATING_CAPTION_BACKGROUND_OPACITY,
  },
  medium: {
    settingsVersion: FLOATING_CAPTION_SETTINGS_VERSION,
    preset: "medium",
    width: 720,
    height: 190,
    fontSize: 40,
    backgroundOpacity: DEFAULT_FLOATING_CAPTION_BACKGROUND_OPACITY,
  },
  large: {
    settingsVersion: FLOATING_CAPTION_SETTINGS_VERSION,
    preset: "large",
    width: 980,
    height: 260,
    fontSize: 56,
    backgroundOpacity: DEFAULT_FLOATING_CAPTION_BACKGROUND_OPACITY,
  },
  bottom_bar: {
    settingsVersion: FLOATING_CAPTION_SETTINGS_VERSION,
    preset: "bottom_bar",
    width: 900,
    height: 220,
    fontSize: DEFAULT_FLOATING_CAPTION_FONT_SIZE,
    backgroundOpacity: DEFAULT_FLOATING_CAPTION_BACKGROUND_OPACITY,
  },
};

export const DEFAULT_FLOATING_CAPTION_SETTINGS =
  FLOATING_CAPTION_PRESETS.bottom_bar;
