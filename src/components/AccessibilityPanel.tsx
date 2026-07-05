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
  FONT_CHOICE_OPTIONS,
  LINE_SPACING_OPTIONS,
  READING_LEVEL_OPTIONS,
  TEXT_SCALE_OPTIONS,
  THEME_PRESET_OPTIONS,
} from "@/lib/design-tokens";
import { useSettingsStore } from "@/stores/settingsStore";
import type {
  FontChoice,
  LineSpacing,
  TextScale,
  ThemePreset,
} from "@/types";

function SettingSelect<Value extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: Value;
  options: readonly { value: Value; label: string }[];
  onChange: (value: Value) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(next as Value)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function AccessibilityPanel() {
  const {
    userName,
    themePreset,
    fontChoice,
    lineSpacing,
    textScale,
    readingLevel,
    reduceCognitiveLoad,
    setUserName,
    setThemePreset,
    setFontChoice,
    setLineSpacing,
    setTextScale,
    setReadingLevel,
    setReduceCognitiveLoad,
  } = useSettingsStore();

  const readingLevelIndex = READING_LEVEL_OPTIONS.findIndex(
    (option) => option.value === readingLevel,
  );

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="settings-you"
        className="space-y-5 rounded-2xl border p-4"
      >
        <h2
          id="settings-you"
          className="text-sm font-medium uppercase tracking-wide"
        >
          You
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
      </section>

      <section
        aria-labelledby="settings-display"
        className="space-y-5 rounded-2xl border p-4"
      >
        <h2
          id="settings-display"
          className="text-sm font-medium uppercase tracking-wide"
        >
          Display
        </h2>

        <SettingSelect<ThemePreset>
          id="theme-preset"
          label="Color theme"
          value={themePreset}
          options={THEME_PRESET_OPTIONS}
          onChange={setThemePreset}
        />

        <SettingSelect<FontChoice>
          id="font-choice"
          label="Font"
          value={fontChoice}
          options={FONT_CHOICE_OPTIONS}
          onChange={setFontChoice}
        />

        <SettingSelect<TextScale>
          id="text-scale"
          label="Text size"
          value={textScale}
          options={TEXT_SCALE_OPTIONS}
          onChange={setTextScale}
        />

        <SettingSelect<LineSpacing>
          id="line-spacing"
          label="Line spacing"
          value={lineSpacing}
          options={LINE_SPACING_OPTIONS}
          onChange={setLineSpacing}
        />
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
