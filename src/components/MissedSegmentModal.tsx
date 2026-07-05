"use client";

import { useState } from "react";

import { History, RefreshCw } from "lucide-react";

import { CatchUpCardView } from "@/components/CatchUpCardView";
import { announce } from "@/components/StatusAnnouncer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCaptionStore } from "@/stores/captionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { MissedSegmentResponse } from "@/types";

type MissedSegmentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type RecapWindow = {
  fromTimestamp: number;
  toTimestamp: number;
};

export function MissedSegmentModal({
  open,
  onOpenChange,
}: MissedSegmentModalProps) {
  const getTranscriptTextForWindow = useCaptionStore(
    (state) => state.getTranscriptTextForWindow,
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MissedSegmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<RecapWindow | null>(null);

  const requestRecap = async (window: RecapWindow) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setLastRequest(window);
    announce("Building your recap");

    const transcript = getTranscriptTextForWindow(
      window.fromTimestamp,
      window.toTimestamp,
    );
    const userName = useSettingsStore.getState().userName;

    try {
      const response = await fetch("/api/missed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromTimestamp: window.fromTimestamp,
          toTimestamp: window.toTimestamp,
          transcript,
          userName: userName || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate recap");
      }

      const data = (await response.json()) as MissedSegmentResponse;
      setResult(data);
      announce("Recap ready");
    } catch {
      setError("Couldn't build your recap.");
      announce("Couldn't build your recap");
    } finally {
      setLoading(false);
    }
  };

  const requestRecentRecap = (windowSec: number) => {
    const { playbackTimeSec } = useCaptionStore.getState();
    void requestRecap({
      fromTimestamp: Math.max(0, playbackTimeSec - windowSec),
      toTimestamp: playbackTimeSec,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Catch me up</DialogTitle>
          <DialogDescription>
            A short, practical recap of what changed while you were away.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Button
            size="xl"
            className="w-full justify-start"
            disabled={loading}
            autoFocus
            onClick={() => requestRecentRecap(120)}
          >
            <History aria-hidden />
            Last 2 minutes
          </Button>
          <Button
            size="xl"
            variant="outline"
            className="w-full justify-start"
            disabled={loading}
            onClick={() => requestRecentRecap(90)}
          >
            <History aria-hidden />
            Last 90 seconds
          </Button>
        </div>

        {loading && (
          <div className="space-y-2 rounded-xl bg-muted p-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted p-4">
            <p className="text-sm">{error}</p>
            {lastRequest && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void requestRecap(lastRequest)}
              >
                <RefreshCw aria-hidden />
                Try again
              </Button>
            )}
          </div>
        )}

        {result && !loading && (
          <CatchUpCardView card={result.card} sample={result.sample} />
        )}
      </DialogContent>
    </Dialog>
  );
}
