import type {
  FontChoice,
  LineSpacing,
  TextScale,
  ThemePreset,
} from "@/types";

export const THEME_PRESET_OPTIONS: { value: ThemePreset; label: string }[] = [
  { value: "calm-light", label: "Calm light" },
  { value: "calm-dark", label: "Calm dark" },
  { value: "high-contrast", label: "High contrast" },
];

export const FONT_CHOICE_OPTIONS: { value: FontChoice; label: string }[] = [
  { value: "default", label: "Standard" },
  { value: "dyslexia", label: "Dyslexia-friendly" },
];

export const LINE_SPACING_OPTIONS: { value: LineSpacing; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "relaxed", label: "Relaxed" },
  { value: "loose", label: "Loose" },
];

export const TEXT_SCALE_OPTIONS: { value: TextScale; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "large", label: "Large" },
  { value: "x-large", label: "Extra large" },
];

export const READING_LEVEL_OPTIONS = [
  { value: "grade6" as const, label: "Grade 6" },
  { value: "grade8" as const, label: "Grade 8" },
  { value: "original" as const, label: "Original" },
];
