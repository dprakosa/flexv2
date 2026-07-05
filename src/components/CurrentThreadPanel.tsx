"use client";

import { Compass } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CURRENT_THREAD_WINDOW_SEC } from "@/lib/current-thread";
import { useCaptionStore } from "@/stores/captionStore";

type ThreadFieldProps = {
  label: string;
  value?: string;
  emptyText: string;
};

function ThreadField({ label, value, emptyText }: ThreadFieldProps) {
  return (
    <div className="space-y-1">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </h3>
      <p className="text-sm leading-relaxed">
        {value ?? (
          <span className="text-muted-foreground">{emptyText}</span>
        )}
      </p>
    </div>
  );
}

export function CurrentThreadPanel() {
  const mode = useCaptionStore((state) => state.mode);
  const isCapturing = useCaptionStore((state) => state.isCapturing);
  const currentThread = useCaptionStore((state) => state.currentThread);
  const playbackTimeSec = useCaptionStore((state) => state.playbackTimeSec);

  const sessionActive = mode !== "idle";
  const hasAnySignal =
    Boolean(currentThread.currentTopic) ||
    Boolean(currentThread.lastDecision) ||
    Boolean(currentThread.openQuestion);

  const isStale =
    typeof currentThread.updatedAt === "number" &&
    playbackTimeSec - currentThread.updatedAt > CURRENT_THREAD_WINDOW_SEC;

  let helperText = "A short snapshot of where the meeting is right now.";

  if (!sessionActive) {
    helperText = "Start listening to see the current thread.";
  } else if (isCapturing && !hasAnySignal) {
    helperText = "Listening… the thread will appear as speech is captured.";
  } else if (isStale && hasAnySignal) {
    helperText = "This may be a little out of date. Catch me up for a fresher read.";
  }

  return (
    <Card className="rounded-2xl border border-l-4 border-l-section-thread bg-section-thread-tint ring-0">
      <CardHeader className="pb-2">
        <CardTitle
          asChild
          className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-section-thread"
        >
          <h2>
            <Compass className="size-4" aria-hidden />
            Current thread
          </h2>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{helperText}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ThreadField
          label="Current topic"
          value={currentThread.currentTopic}
          emptyText={
            sessionActive
              ? "Not clear yet."
              : "Nothing captured yet."
          }
        />
        <ThreadField
          label="Last decision"
          value={currentThread.lastDecision}
          emptyText={
            sessionActive
              ? "No decision captured yet."
              : "None captured yet."
          }
        />
        <ThreadField
          label="Open question"
          value={currentThread.openQuestion}
          emptyText={
            sessionActive
              ? "No open question right now."
              : "None captured yet."
          }
        />
      </CardContent>
    </Card>
  );
}
