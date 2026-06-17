export type FloatingPreset = "small" | "medium" | "large" | "bottom_bar";

export type FloatingCaptionSettings = {
  preset: FloatingPreset;
  width: number;
  height: number;
  fontSize: number;
  backgroundOpacity: number;
};

export const FLOATING_CAPTION_FONT_SIZE_MIN = 14;
export const FLOATING_CAPTION_FONT_SIZE_MAX = 88;

export const FLOATING_CAPTION_PRESETS: Record<
  FloatingPreset,
  FloatingCaptionSettings
> = {
  small: {
    preset: "small",
    width: 520,
    height: 160,
    fontSize: 30,
    backgroundOpacity: 0.32,
  },
  medium: {
    preset: "medium",
    width: 720,
    height: 190,
    fontSize: 40,
    backgroundOpacity: 0.32,
  },
  large: {
    preset: "large",
    width: 980,
    height: 260,
    fontSize: 56,
    backgroundOpacity: 0.32,
  },
  bottom_bar: {
    preset: "bottom_bar",
    width: 900,
    height: 220,
    fontSize: 48,
    backgroundOpacity: 0.32,
  },
};

export const DEFAULT_FLOATING_CAPTION_SETTINGS =
  FLOATING_CAPTION_PRESETS.bottom_bar;
