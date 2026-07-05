"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ArrowDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getDisplayText, formatTimestamp } from "@/lib/captions";
import { cn } from "@/lib/utils";
import { useCaptionStore } from "@/stores/captionStore";
import { useSettingsStore } from "@/stores/settingsStore";

// Pairs each meaning color with its word so color is never the only cue.
function CaptionLegend() {
  return (
    <div
      aria-hidden
      className="flex items-center gap-3 text-xs text-muted-foreground"
    >
      <span className="flex items-center gap-1">
        <span style={{ color: "var(--caption-decision)" }}>●</span>
        Decision
      </span>
      <span className="flex items-center gap-1">
        <span style={{ color: "var(--caption-action)" }}>●</span>
        Action
      </span>
    </div>
  );
}

export function CaptionDisplay() {
  const captions = useCaptionStore((state) => state.captions);
  const transcriptChunks = useCaptionStore((state) => state.transcriptChunks);
  const mode = useCaptionStore((state) => state.mode);
  const requestLineAsk = useCaptionStore((state) => state.requestLineAsk);
  const readingLevel = useSettingsStore((state) => state.readingLevel);
  const reduceCognitiveLoad = useSettingsStore(
    (state) => state.reduceCognitiveLoad,
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [following, setFollowing] = useState(true);

  const sessionActive = mode !== "idle";

  const visibleCaptions = useMemo(() => {
    if (reduceCognitiveLoad && captions.length > 0) {
      return captions.slice(-2);
    }

    return captions;
  }, [captions, reduceCognitiveLoad]);

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
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide opacity-80">
          Live captions
        </h2>
        <CaptionLegend />
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
            className="space-y-3 text-xl"
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
                const meaningColor = chunk.isDecision
                  ? "var(--caption-decision)"
                  : chunk.isActionItem
                    ? "var(--caption-action)"
                    : undefined;

                return (
                  <article
                    key={chunk.id}
                    className="grid grid-cols-[3.5rem_1fr] gap-x-2"
                  >
                    <time
                      className="pt-2.5 text-xs tabular-nums text-muted-foreground"
                      dateTime={`PT${chunk.timestamp}S`}
                    >
                      {formatTimestamp(chunk.timestamp)}
                    </time>
                    <button
                      type="button"
                      disabled={!sessionActive}
                      onClick={() => requestLineAsk(text, chunk.timestamp)}
                      className="group/line -mx-2 rounded-lg px-2 py-1 text-left transition-colors outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/60"
                    >
                      <p
                        className={cn(
                          "leading-(--app-leading)",
                          meaningColor && "font-semibold",
                          !meaningColor &&
                            (isNewest
                              ? "text-foreground"
                              : "text-foreground/70"),
                        )}
                        style={meaningColor ? { color: meaningColor } : undefined}
                      >
                        {chunk.isDecision && (
                          <span className="sr-only">Decision: </span>
                        )}
                        {chunk.isActionItem && !chunk.isDecision && (
                          <span className="sr-only">Action: </span>
                        )}
                        {text}
                        <span className="sr-only">
                          , tap to ask what this means
                        </span>
                        <span
                          aria-hidden
                          className="ml-2 align-middle text-sm font-medium text-muted-foreground opacity-0 transition-opacity group-hover/line:opacity-100 group-focus-visible/line:opacity-100"
                        >
                          Ask →
                        </span>
                      </p>
                    </button>
                  </article>
                );
              })
            )}
            {partialChunk && (
              <div className="grid grid-cols-[3.5rem_1fr] gap-x-2">
                <span aria-hidden />
                <p className="px-2 py-1 leading-(--app-leading) text-muted-foreground">
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
    </section>
  );
}
