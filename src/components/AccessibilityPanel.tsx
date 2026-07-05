"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  CAPTION_DELAY_OPTIONS,
  READING_LEVEL_OPTIONS,
  TEXT_SCALE_OPTIONS,
  THEME_PRESET_OPTIONS,
} from "@/lib/design-tokens";
import { useSettingsStore } from "@/stores/settingsStore";
import type { TextScale, ThemePreset } from "@/types";

export function AccessibilityPanel() {
  const {
    userName,
    themePreset,
    textScale,
    readingLevel,
    captionDelaySec,
    reduceCognitiveLoad,
    setUserName,
    setThemePreset,
    setTextScale,
    setReadingLevel,
    setCaptionDelaySec,
    setReduceCognitiveLoad,
  } = useSettingsStore();

  const readingLevelIndex = READING_LEVEL_OPTIONS.findIndex(
    (option) => option.value === readingLevel,
  );

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="settings-you-appearance"
        className="space-y-5 rounded-2xl border p-4"
      >
        <h2
          id="settings-you-appearance"
          className="text-sm font-medium uppercase tracking-wide"
        >
          You &amp; appearance
        </h2>

        <div className="space-y-2">
          <Label htmlFor="user-name">Your name</Label>
          <Input
            id="user-name"
            value={userName}
            placeholder="e.g. Marcus"
            autoComplete="off"
            onChange={(event) => setUserName(event.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Used to spot when you&apos;re mentioned. Stays on this device.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="theme-preset">Theme</Label>
          <Select
            value={themePreset}
            onValueChange={(value) => setThemePreset(value as ThemePreset)}
          >
            <SelectTrigger id="theme-preset" className="w-full">
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              {THEME_PRESET_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="text-scale">Text size</Label>
          <Select
            value={textScale}
            onValueChange={(value) => setTextScale(value as TextScale)}
          >
            <SelectTrigger id="text-scale" className="w-full">
              <SelectValue placeholder="Select text size" />
            </SelectTrigger>
            <SelectContent>
              {TEXT_SCALE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section
        aria-labelledby="settings-captions"
        className="space-y-5 rounded-2xl border p-4"
      >
        <h2
          id="settings-captions"
          className="text-sm font-medium uppercase tracking-wide"
        >
          Captions
        </h2>

        <div className="space-y-3">
          <Label htmlFor="reading-level">Reading level</Label>
          <Slider
            id="reading-level"
            min={0}
            max={READING_LEVEL_OPTIONS.length - 1}
            step={1}
            value={[readingLevelIndex >= 0 ? readingLevelIndex : 2]}
            onValueChange={([value]) => {
              const option = READING_LEVEL_OPTIONS[value ?? 2];
              if (option) setReadingLevel(option.value);
            }}
          />
          <p className="text-sm text-muted-foreground">
            {READING_LEVEL_OPTIONS[readingLevelIndex]?.label ?? "Original"}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="caption-delay">Caption delay</Label>
          <Select
            value={String(captionDelaySec)}
            onValueChange={(value) => setCaptionDelaySec(Number(value))}
          >
            <SelectTrigger id="caption-delay" className="w-full">
              <SelectValue placeholder="Select delay" />
            </SelectTrigger>
            <SelectContent>
              {CAPTION_DELAY_OPTIONS.map((seconds) => (
                <SelectItem key={seconds} value={String(seconds)}>
                  {seconds === 0 ? "Live (no delay)" : `${seconds} seconds`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <Label htmlFor="calmer-captions">Calmer captions</Label>
            <p className="text-sm text-muted-foreground">
              Show only the last two lines and hide filler words
            </p>
          </div>
          <Switch
            id="calmer-captions"
            checked={reduceCognitiveLoad}
            onCheckedChange={setReduceCognitiveLoad}
          />
        </div>
      </section>
    </div>
  );
}
