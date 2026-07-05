"use client";

import { useEffect } from "react";

import { useSettingsStore } from "@/stores/settingsStore";

const DARK_PRESETS = new Set(["calm-dark", "high-contrast"]);

export function ThemeApplier() {
  const themePreset = useSettingsStore((state) => state.themePreset);
  const textScale = useSettingsStore((state) => state.textScale);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = themePreset;
    root.classList.toggle("dark", DARK_PRESETS.has(themePreset));
  }, [themePreset]);

  useEffect(() => {
    document.documentElement.dataset.textSize = textScale;
  }, [textScale]);

  return null;
}
