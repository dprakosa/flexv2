"use client";

import { useEffect, useRef, useState } from "react";

import { ImageIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MIN_TOPIC_CHARS_FOR_SEARCH } from "@/lib/visual-context";
import { useCaptionStore } from "@/stores/captionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { VisualContextResponse, VisualContextResult } from "@/types";

// Heuristic only, no AI check: shows the top SerpAPI image result for the
// current topic verbatim. Renders nothing while there's no topic or no
// result — there's no relevance filter, so an unrelated image can surface.
export function VisualContextCard() {
  const mode = useCaptionStore((state) => state.mode);
  const currentTopic = useCaptionStore(
    (state) => state.currentThread.currentTopic,
  );
  const reduceCognitiveLoad = useSettingsStore(
    (state) => state.reduceCognitiveLoad,
  );

  const [result, setResult] = useState<VisualContextResult | null>(null);
  const lastQueriedTopic = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (mode === "idle") {
      lastQueriedTopic.current = null;
    }
  }, [mode]);

  useEffect(() => {
    if (reduceCognitiveLoad) return;
    if (mode === "idle") return;
    if (!currentTopic || currentTopic.length < MIN_TOPIC_CHARS_FOR_SEARCH) return;
    if (currentTopic === lastQueriedTopic.current) return;

    lastQueriedTopic.current = currentTopic;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    void (async () => {
      try {
        const response = await fetch("/api/visual-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: currentTopic }),
          signal: controller.signal,
        });
        if (!response.ok) return;

        const data = (await response.json()) as VisualContextResponse;
        if (!controller.signal.aborted) setResult(data.result);
      } catch {
        // Aborted or network failure — stay silent rather than show an error.
      }
    })();

    return () => controller.abort();
  }, [currentTopic, mode, reduceCognitiveLoad]);

  if (!result || mode === "idle") return null;

  return (
    <Card className="rounded-2xl border border-l-4 border-l-section-visual bg-section-visual-tint ring-0">
      <CardHeader className="pb-2">
        <CardTitle
          asChild
          className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-section-visual"
        >
          <h2>
            <ImageIcon className="size-4" aria-hidden />
            Visual context
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <a href={result.sourceUrl} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.imageUrl}
            alt={result.caption}
            className="max-h-64 w-full rounded-xl border object-contain"
          />
        </a>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {result.caption}
        </p>
      </CardContent>
    </Card>
  );
}
