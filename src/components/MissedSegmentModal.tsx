"use client";

import { useState } from "react";

import { Flag, History, RefreshCw } from "lucide-react";

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
import { formatTimestamp } from "@/lib/captions";
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
  usesLostMarker?: boolean;
};

export function MissedSegmentModal({
  open,
  onOpenChange,
}: MissedSegmentModalProps) {
  const lostMarkerTimestamp = useCaptionStore(
    (state) => state.lostMarkerTimestamp,
  );
  const getCatchUpWindow = useCaptionStore((state) => state.getCatchUpWindow);
  const getTranscriptTextForWindow = useCaptionStore(
    (state) => state.getTranscriptTextForWindow,
  );
  const clearLostMarker = useCaptionStore((state) => state.clearLostMarker);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MissedSegmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<RecapWindow | null>(null);
  const [markerCleared, setMarkerCleared] = useState(false);

  const requestRecap = async (window: RecapWindow) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setMarkerCleared(false);
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
          usesLostMarker: Boolean(window.usesLostMarker),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate recap");
      }

      const data = (await response.json()) as MissedSegmentResponse;
      setResult(data);

      if (window.usesLostMarker) {
        clearLostMarker();
        setMarkerCleared(true);
        announce("Recap ready. Lost marker cleared.");
      } else {
        announce("Recap ready");
      }
    } catch {
      setError("Couldn't build your recap.");
      announce("Couldn't build your recap");
    } finally {
      setLoading(false);
    }
  };

  const requestLostRecap = () => {
    const window = getCatchUpWindow();
    void requestRecap({
      fromTimestamp: window.fromTimestamp,
      toTimestamp: window.toTimestamp,
      usesLostMarker: true,
    });
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
            Get a short recap of what you missed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {lostMarkerTimestamp !== null && (
            <Button
              size="xl"
              className="w-full justify-start"
              disabled={loading}
              autoFocus
              onClick={requestLostRecap}
            >
              <Flag aria-hidden />
              Since I got lost
              <span className="ml-auto text-sm opacity-70">
                at {formatTimestamp(lostMarkerTimestamp)}
              </span>
            </Button>
          )}
          <Button
            size="xl"
            variant="outline"
            className="w-full justify-start"
            disabled={loading}
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
          <CatchUpCardView
            card={result.card}
            sample={result.sample}
            usedLostMarker={lastRequest?.usesLostMarker}
            markerCleared={markerCleared}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
