"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type {
  FontChoice,
  LineSpacing,
  ReadingLevel,
  TextScale,
  ThemePreset,
  UserAccessibilitySettings,
} from "@/types";

type SettingsState = UserAccessibilitySettings & {
  setUserName: (userName: string) => void;
  setThemePreset: (themePreset: ThemePreset) => void;
  setFontChoice: (fontChoice: FontChoice) => void;
  setLineSpacing: (lineSpacing: LineSpacing) => void;
  setTextScale: (textScale: TextScale) => void;
  setReadingLevel: (readingLevel: ReadingLevel) => void;
  setReduceCognitiveLoad: (reduceCognitiveLoad: boolean) => void;
  reset: () => void;
};

const DEFAULT_SETTINGS: UserAccessibilitySettings = {
  userName: "",
  themePreset: "calm-light",
  fontChoice: "default",
  lineSpacing: "normal",
  textScale: "default",
  readingLevel: "original",
  reduceCognitiveLoad: false,
};

// v0/v1 shape (pre-theme-presets).
type LegacySettings = Partial<{
  contrastPreset: "default" | "high" | "dark-calm" | "dyslexia";
  fontSize: number;
  readingLevel: ReadingLevel;
  reduceCognitiveLoad: boolean;
}>;

// v2 shape: bundled "dyslexia" theme preset + captionDelaySec.
type SettingsV2 = Partial<
  Omit<UserAccessibilitySettings, "themePreset" | "fontChoice" | "lineSpacing">
> & {
  themePreset?: ThemePreset | "dyslexia";
  captionDelaySec?: number;
};

const LEGACY_THEME_MAP: Record<string, ThemePreset | "dyslexia"> = {
  default: "calm-light",
  high: "high-contrast",
  "dark-calm": "calm-dark",
  dyslexia: "dyslexia",
};

function migrateLegacyToV2(persisted: unknown): SettingsV2 {
  const legacy = (persisted ?? {}) as LegacySettings;

  const fontSize = legacy.fontSize ?? 20;
  const textScale: TextScale =
    fontSize >= 28 ? "x-large" : fontSize >= 22 ? "large" : "default";

  return {
    themePreset: LEGACY_THEME_MAP[legacy.contrastPreset ?? ""] ?? "calm-light",
    textScale,
    readingLevel: legacy.readingLevel,
    reduceCognitiveLoad: legacy.reduceCognitiveLoad,
  };
}

// v3: the "dyslexia" preset splits into color theme + font choice, and
// the caption-delay setting is dropped.
function migrateV2ToV3(persisted: SettingsV2): UserAccessibilitySettings {
  const wasDyslexia = persisted.themePreset === "dyslexia";
  const themePreset: ThemePreset =
    !persisted.themePreset || persisted.themePreset === "dyslexia"
      ? DEFAULT_SETTINGS.themePreset
      : persisted.themePreset;

  return {
    ...DEFAULT_SETTINGS,
    userName: persisted.userName ?? DEFAULT_SETTINGS.userName,
    themePreset,
    fontChoice: wasDyslexia ? "dyslexia" : DEFAULT_SETTINGS.fontChoice,
    textScale: persisted.textScale ?? DEFAULT_SETTINGS.textScale,
    readingLevel: persisted.readingLevel ?? DEFAULT_SETTINGS.readingLevel,
    reduceCognitiveLoad:
      persisted.reduceCognitiveLoad ?? DEFAULT_SETTINGS.reduceCognitiveLoad,
  };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setUserName: (userName) => set({ userName }),
      setThemePreset: (themePreset) => set({ themePreset }),
      setFontChoice: (fontChoice) => set({ fontChoice }),
      setLineSpacing: (lineSpacing) => set({ lineSpacing }),
      setTextScale: (textScale) => set({ textScale }),
      setReadingLevel: (readingLevel) => set({ readingLevel }),
      setReduceCognitiveLoad: (reduceCognitiveLoad) =>
        set({ reduceCognitiveLoad }),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: "flexv2-accessibility-settings",
      version: 3,
      migrate: (persisted, version) => {
        if (version < 2) {
          return migrateV2ToV3(migrateLegacyToV2(persisted)) as SettingsState;
        }
        if (version < 3) {
          return migrateV2ToV3(persisted as SettingsV2) as SettingsState;
        }
        return persisted as SettingsState;
      },
      partialize: (state) => ({
        userName: state.userName,
        themePreset: state.themePreset,
        fontChoice: state.fontChoice,
        lineSpacing: state.lineSpacing,
        textScale: state.textScale,
        readingLevel: state.readingLevel,
        reduceCognitiveLoad: state.reduceCognitiveLoad,
      }),
    },
  ),
);
