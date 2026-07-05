import type { TextScale, ThemePreset } from "@/types";

export const THEME_PRESET_OPTIONS: { value: ThemePreset; label: string }[] = [
  { value: "calm-light", label: "Calm light" },
  { value: "calm-dark", label: "Calm dark" },
  { value: "high-contrast", label: "High contrast" },
  { value: "dyslexia", label: "Dyslexia-friendly" },
];

export const TEXT_SCALE_OPTIONS: { value: TextScale; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "large", label: "Large" },
  { value: "x-large", label: "Extra large" },
];

export const CAPTION_DELAY_OPTIONS = [0, 3, 5, 10] as const;

export const READING_LEVEL_OPTIONS = [
  { value: "grade6" as const, label: "Grade 6" },
  { value: "grade8" as const, label: "Grade 8" },
  { value: "original" as const, label: "Original" },
];
