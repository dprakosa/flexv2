"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ArrowDown } from "lucide-react";

import { NowStrip } from "@/components/NowStrip";
import { Button } from "@/components/ui/button";
import { getDisplayText, formatTimestamp } from "@/lib/captions";
import { cn } from "@/lib/utils";
import { useCaptionStore } from "@/stores/captionStore";
import { useSettingsStore } from "@/stores/settingsStore";

// Decisions and action items are marked with a labeled chip, not color
// alone (WCAG 1.4.1); the caption text itself stays normal ink.
function CaptionChip({ kind }: { kind: "decision" | "action" }) {
  const colorVar =
    kind === "decision" ? "var(--caption-decision)" : "var(--caption-action)";

  return (
    <span
      className="inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        color: colorVar,
        backgroundColor: `color-mix(in oklab, ${colorVar} 12%, var(--card))`,
      }}
    >
      {kind === "decision" ? "✓ Decision" : "→ Action"}
    </span>
  );
}

export function CaptionDisplay() {
  const captions = useCaptionStore((state) => state.captions);
  const transcriptChunks = useCaptionStore((state) => state.transcriptChunks);
  const mode = useCaptionStore((state) => state.mode);
  const playbackTimeSec = useCaptionStore((state) => state.playbackTimeSec);
  const readingLevel = useSettingsStore((state) => state.readingLevel);
  const captionDelaySec = useSettingsStore((state) => state.captionDelaySec);
  const reduceCognitiveLoad = useSettingsStore(
    (state) => state.reduceCognitiveLoad,
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [following, setFollowing] = useState(true);

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

  // The newest in-progress (non-final) transcript chunk, shown as a muted
  // line; its id flips to a final caption on completion, so no duplication.
  const partialChunk = useMemo(() => {
    const partials = transcriptChunks.filter((chunk) => !chunk.isFinal);
    return partials.length > 0 ? partials[partials.length - 1] : null;
  }, [transcriptChunks]);

  // Follow the live edge; pause when the user scrolls up to read history.
  useEffect(() => {
    if (following) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [visibleCaptions.length, partialChunk?.text, following]);

  const jumpToLatest = () => {
    setFollowing(true);
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  return (
    <section
      aria-label="Live captions"
      className="flex min-h-[45dvh] flex-1 flex-col rounded-2xl border bg-card p-5 text-card-foreground lg:min-h-0"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide opacity-80">
          Live captions
        </h2>
        {captionDelaySec > 0 && (
          <span className="text-sm opacity-80">{captionDelaySec}s delay</span>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto pr-3"
          onScroll={() => {
            const el = scrollRef.current;
            if (!el) return;
            const nearBottom =
              el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            setFollowing((current) =>
              current === nearBottom ? current : nearBottom,
            );
          }}
        >
          <div
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            className="space-y-4 text-xl"
          >
            {visibleCaptions.length === 0 && !partialChunk ? (
              <p className="text-base text-muted-foreground">
                {mode === "idle"
                  ? "Start listening and captions will appear here."
                  : "Listening — captions will show up as speech comes in."}
              </p>
            ) : (
              visibleCaptions.map((chunk, index) => {
                const text = getDisplayText(
                  chunk,
                  readingLevel,
                  reduceCognitiveLoad,
                );
                const isNewest = index === visibleCaptions.length - 1;

                return (
                  <article
                    key={chunk.id}
                    className="grid grid-cols-[3.5rem_1fr] gap-x-2"
                  >
                    <time
                      className="pt-1.5 text-xs tabular-nums text-muted-foreground"
                      dateTime={`PT${chunk.timestamp}S`}
                    >
                      {formatTimestamp(chunk.timestamp)}
                    </time>
                    <div className="space-y-1">
                      {chunk.isDecision ? (
                        <CaptionChip kind="decision" />
                      ) : chunk.isActionItem ? (
                        <CaptionChip kind="action" />
                      ) : null}
                      <p
                        className={cn(
                          "leading-relaxed",
                          isNewest ? "text-foreground" : "text-foreground/70",
                        )}
                      >
                        {text}
                      </p>
                    </div>
                  </article>
                );
              })
            )}
            {partialChunk && (
              <div className="grid grid-cols-[3.5rem_1fr] gap-x-2">
                <span aria-hidden />
                <p className="leading-relaxed text-muted-foreground">
                  {partialChunk.text}…
                </p>
              </div>
            )}
          </div>
          <div ref={endRef} aria-hidden />
        </div>

        {!following && (
          <Button
            size="sm"
            className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full"
            onClick={jumpToLatest}
          >
            <ArrowDown aria-hidden />
            Latest
          </Button>
        )}
      </div>

      <NowStrip />
    </section>
  );
}
