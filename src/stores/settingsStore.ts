"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { CAPTION_DELAY_OPTIONS } from "@/lib/design-tokens";
import type {
  ReadingLevel,
  TextScale,
  ThemePreset,
  UserAccessibilitySettings,
} from "@/types";

type SettingsState = UserAccessibilitySettings & {
  setUserName: (userName: string) => void;
  setThemePreset: (themePreset: ThemePreset) => void;
  setTextScale: (textScale: TextScale) => void;
  setReadingLevel: (readingLevel: ReadingLevel) => void;
  setCaptionDelaySec: (captionDelaySec: number) => void;
  setReduceCognitiveLoad: (reduceCognitiveLoad: boolean) => void;
  reset: () => void;
};

const DEFAULT_SETTINGS: UserAccessibilitySettings = {
  userName: "",
  themePreset: "calm-light",
  textScale: "default",
  readingLevel: "original",
  captionDelaySec: CAPTION_DELAY_OPTIONS[0],
  reduceCognitiveLoad: false,
};

type LegacySettings = Partial<{
  contrastPreset: "default" | "high" | "dark-calm" | "dyslexia";
  fontSize: number;
  readingLevel: ReadingLevel;
  captionDelaySec: number;
  reduceCognitiveLoad: boolean;
}>;

const LEGACY_THEME_MAP: Record<string, ThemePreset> = {
  default: "calm-light",
  high: "high-contrast",
  "dark-calm": "calm-dark",
  dyslexia: "dyslexia",
};

function migrateLegacySettings(
  persisted: unknown,
): UserAccessibilitySettings {
  const legacy = (persisted ?? {}) as LegacySettings;

  const fontSize = legacy.fontSize ?? 20;
  const textScale: TextScale =
    fontSize >= 28 ? "x-large" : fontSize >= 22 ? "large" : "default";

  return {
    ...DEFAULT_SETTINGS,
    themePreset:
      LEGACY_THEME_MAP[legacy.contrastPreset ?? ""] ??
      DEFAULT_SETTINGS.themePreset,
    textScale,
    readingLevel: legacy.readingLevel ?? DEFAULT_SETTINGS.readingLevel,
    captionDelaySec:
      legacy.captionDelaySec ?? DEFAULT_SETTINGS.captionDelaySec,
    reduceCognitiveLoad:
      legacy.reduceCognitiveLoad ?? DEFAULT_SETTINGS.reduceCognitiveLoad,
  };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setUserName: (userName) => set({ userName }),
      setThemePreset: (themePreset) => set({ themePreset }),
      setTextScale: (textScale) => set({ textScale }),
      setReadingLevel: (readingLevel) => set({ readingLevel }),
      setCaptionDelaySec: (captionDelaySec) => set({ captionDelaySec }),
      setReduceCognitiveLoad: (reduceCognitiveLoad) =>
        set({ reduceCognitiveLoad }),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: "flexv2-accessibility-settings",
      version: 2,
      migrate: (persisted, version) =>
        version < 2
          ? (migrateLegacySettings(persisted) as SettingsState)
          : (persisted as SettingsState),
      partialize: (state) => ({
        userName: state.userName,
        themePreset: state.themePreset,
        textScale: state.textScale,
        readingLevel: state.readingLevel,
        captionDelaySec: state.captionDelaySec,
        reduceCognitiveLoad: state.reduceCognitiveLoad,
      }),
    },
  ),
);
