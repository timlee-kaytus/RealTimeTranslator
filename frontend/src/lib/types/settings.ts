export type FloatingPreset = "small" | "medium" | "large" | "bottom_bar";

export type FloatingCaptionSettings = {
  preset: FloatingPreset;
  width: number;
  height: number;
  fontSize: number;
};

export const FLOATING_CAPTION_PRESETS: Record<
  FloatingPreset,
  FloatingCaptionSettings
> = {
  small: {
    preset: "small",
    width: 520,
    height: 160,
    fontSize: 30,
  },
  medium: {
    preset: "medium",
    width: 720,
    height: 190,
    fontSize: 40,
  },
  large: {
    preset: "large",
    width: 980,
    height: 260,
    fontSize: 56,
  },
  bottom_bar: {
    preset: "bottom_bar",
    width: 900,
    height: 220,
    fontSize: 48,
  },
};

export const DEFAULT_FLOATING_CAPTION_SETTINGS =
  FLOATING_CAPTION_PRESETS.bottom_bar;

