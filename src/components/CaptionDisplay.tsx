"use client";

import { useMemo } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { getDisplayText, formatTimestamp } from "@/lib/captions";
import { useCaptionStore } from "@/stores/captionStore";
import { useSettingsStore } from "@/stores/settingsStore";

export function CaptionDisplay() {
  const captions = useCaptionStore((state) => state.captions);
  const mode = useCaptionStore((state) => state.mode);
  const playbackTimeSec = useCaptionStore((state) => state.playbackTimeSec);
  const readingLevel = useSettingsStore((state) => state.readingLevel);
  const captionDelaySec = useSettingsStore((state) => state.captionDelaySec);
  const reduceCognitiveLoad = useSettingsStore(
    (state) => state.reduceCognitiveLoad,
  );

  const effectiveTime = Math.max(0, playbackTimeSec - captionDelaySec);

  const visibleCaptions = useMemo(() => {
    const filtered = captions.filter(
      (chunk) => chunk.timestamp <= effectiveTime,
    );

    if (reduceCognitiveLoad && filtered.length > 0) {
      return filtered.slice(-2);
    }

    return filtered;
  }, [captions, effectiveTime, reduceCognitiveLoad]);

  return (
    <section
      aria-label="Live captions"
      className="flex min-h-0 flex-1 flex-col rounded-2xl border bg-card p-5 text-card-foreground shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide opacity-80">
          Live captions
        </h2>
        {captionDelaySec > 0 && (
          <span className="text-sm opacity-80">{captionDelaySec}s delay</span>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1 pr-3">
        <div
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          className="space-y-4 text-xl"
        >
          {visibleCaptions.length === 0 ? (
            <p className="text-base text-muted-foreground">
              {mode === "idle"
                ? "Press Start listening (top right) and captions will appear here."
                : "Listening — captions will appear here in a moment."}
            </p>
          ) : (
            visibleCaptions.map((chunk) => {
              const text = getDisplayText(
                chunk,
                readingLevel,
                reduceCognitiveLoad,
              );

              return (
                <article key={chunk.id} className="space-y-1">
                  <div className="flex items-center gap-2 text-sm opacity-80">
                    <span className="font-semibold">{chunk.speaker}</span>
                    <time dateTime={`PT${chunk.timestamp}S`}>
                      {formatTimestamp(chunk.timestamp)}
                    </time>
                  </div>
                  <p
                    className="leading-relaxed"
                    style={{
                      color: chunk.isDecision
                        ? "var(--caption-decision)"
                        : chunk.isActionItem
                          ? "var(--caption-action)"
                          : undefined,
                    }}
                  >
                    {text}
                  </p>
                </article>
              );
            })
          )}
        </div>
      </ScrollArea>
    </section>
  );
}
