"use client";

import { Flag, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatTimestamp } from "@/lib/captions";
import { useCaptionStore } from "@/stores/captionStore";

export function LostMarkerPill() {
  const lostMarkerTimestamp = useCaptionStore(
    (state) => state.lostMarkerTimestamp,
  );
  const clearLostMarker = useCaptionStore((state) => state.clearLostMarker);

  if (lostMarkerTimestamp === null) return null;

  return (
    <span className="flex items-center gap-1 rounded-full bg-muted py-1 pl-3 pr-1 text-sm text-muted-foreground">
      <Flag className="size-3.5" aria-hidden />
      Lost at {formatTimestamp(lostMarkerTimestamp)}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
            aria-label="Clear lost marker"
            onClick={clearLostMarker}
          >
            <X />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Clear marker</TooltipContent>
      </Tooltip>
    </span>
  );
}
