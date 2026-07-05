"use client";

import { UserRoundCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTimestamp } from "@/lib/captions";
import { getSignalLabel } from "@/lib/meeting-signals";
import { useCaptionStore } from "@/stores/captionStore";
import { useSettingsStore } from "@/stores/settingsStore";

export function DoINeedToDoAnythingPanel() {
  const mode = useCaptionStore((state) => state.mode);
  const isCapturing = useCaptionStore((state) => state.isCapturing);
  const meetingSignals = useCaptionStore((state) => state.meetingSignals);
  const transcriptChunks = useCaptionStore((state) => state.transcriptChunks);
  const userName = useSettingsStore((state) => state.userName);

  const sessionActive = mode !== "idle";
  const hasName = userName.trim().length > 0;
  const chunkById = new Map(transcriptChunks.map((chunk) => [chunk.id, chunk]));

  let helperText =
    "Possible mentions, tasks, and questions for you — phrased cautiously.";

  if (!hasName) {
    helperText =
      "Add your name in Accessibility settings to check for mentions and direct asks.";
  } else if (!sessionActive) {
    helperText = "Start listening to check whether anything needs your attention.";
  } else if (isCapturing && meetingSignals.length === 0) {
    helperText = "Listening… nothing clearly asks you to do anything yet.";
  } else if (meetingSignals.length === 0) {
    helperText = "Nothing clearly asks you to do anything right now.";
  }

  return (
    <Card className="rounded-2xl border border-l-4 border-l-section-tasks bg-section-tasks-tint ring-0">
      <CardHeader className="pb-2">
        <CardTitle
          asChild
          className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-section-tasks"
        >
          <h2>
            <UserRoundCheck className="size-4" aria-hidden />
            Do I need to do anything?
          </h2>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{helperText}</p>
      </CardHeader>
      <CardContent>
        {!hasName ? (
          <p className="text-sm text-muted-foreground">
            Your name is used only to spot direct mentions and asks in the
            transcript.
          </p>
        ) : meetingSignals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {sessionActive
              ? "You were not clearly asked to do anything in the recent transcript."
              : "Nothing flagged for you yet."}
          </p>
        ) : (
          <ul className="space-y-3 text-sm">
            {meetingSignals.map((signal) => {
              const sourceChunk = chunkById.get(signal.sourceChunkIds[0] ?? "");
              const signalKey = `${signal.type}-${signal.sourceChunkIds.join("-")}-${signal.timestamp}`;

              return (
                <li key={signalKey} className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{getSignalLabel(signal)}</span>
                    <Badge variant="outline" className="align-middle">
                      {formatTimestamp(signal.timestamp)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {signal.confidence === "high"
                        ? "fairly clear match"
                        : "uncertain match"}
                    </span>
                  </div>
                  <p>{signal.text}</p>
                  {sourceChunk ? (
                    <blockquote className="border-l-2 border-border pl-3 text-muted-foreground">
                      {sourceChunk.text}
                    </blockquote>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
