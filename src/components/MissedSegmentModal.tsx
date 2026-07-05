"use client";

import { useState } from "react";

import { Flag, History, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTimestamp } from "@/lib/captions";
import { useCaptionStore } from "@/stores/captionStore";
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
  const lostMarkerTimestamp = useCaptionStore(
    (state) => state.lostMarkerTimestamp,
  );
  const getCatchUpWindow = useCaptionStore((state) => state.getCatchUpWindow);
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

    const transcript = getTranscriptTextForWindow(
      window.fromTimestamp,
      window.toTimestamp,
    );

    try {
      const response = await fetch("/api/missed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromTimestamp: window.fromTimestamp,
          toTimestamp: window.toTimestamp,
          transcript,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate recap");
      }

      const data = (await response.json()) as MissedSegmentResponse;
      setResult(data);
    } catch {
      setError("Couldn't build your recap.");
    } finally {
      setLoading(false);
    }
  };

  const requestLostRecap = () => {
    const window = getCatchUpWindow();
    void requestRecap({
      fromTimestamp: window.fromTimestamp,
      toTimestamp: window.toTimestamp,
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
      <DialogContent className="rounded-2xl sm:max-w-lg">
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
              onClick={requestLostRecap}
            >
              <Flag />
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
            <History />
            Last 2 minutes
          </Button>
          <Button
            size="xl"
            variant="outline"
            className="w-full justify-start"
            disabled={loading}
            onClick={() => requestRecentRecap(90)}
          >
            <History />
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
                <RefreshCw />
                Try again
              </Button>
            )}
          </div>
        )}

        {result && !loading && (
          <div className="space-y-3 rounded-xl bg-muted p-4 text-sm">
            <p className="leading-relaxed">{result.recap}</p>
            {result.actionItems.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">Possible tasks</h3>
                <ul className="space-y-1.5">
                  {result.actionItems.map((item) => (
                    <li key={item.id} className="flex items-center gap-2">
                      {item.assignee && (
                        <Badge variant="secondary">{item.assignee}</Badge>
                      )}
                      {item.task}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
