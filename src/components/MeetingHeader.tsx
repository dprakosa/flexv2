"use client";

import { useEffect, useState } from "react";

import {
  MonitorPlay,
  MoreHorizontal,
  Pin,
  PinOff,
  Settings2,
  Square,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getAlwaysOnTop, isDesktop, setAlwaysOnTop } from "@/lib/desktop";
import { useCaptionStore } from "@/stores/captionStore";

type MeetingHeaderProps = {
  captureWarning?: string | null;
  onStartDemo: () => void;
  onStartLive: () => void;
  onStop: () => void;
  onUpload: () => void;
  onOpenSettings: () => void;
};

export function MeetingHeader({
  captureWarning,
  onStartDemo,
  onStartLive,
  onStop,
  onUpload,
  onOpenSettings,
}: MeetingHeaderProps) {
  const mode = useCaptionStore((state) => state.mode);
  const isCapturing = useCaptionStore((state) => state.isCapturing);
  const isDemoMode = useCaptionStore((state) => state.isDemoMode);

  const [desktop, setDesktop] = useState(false);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (!isDesktop()) return;
    void getAlwaysOnTop().then((pinnedNow) => {
      setDesktop(true);
      setPinned(pinnedNow);
    });
  }, []);

  const togglePinned = () => {
    const next = !pinned;
    setPinned(next);
    void setAlwaysOnTop(next);
  };

  const sessionActive = mode !== "idle";

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold tracking-tight">
          Catch-Up Companion
        </h1>
        {isDemoMode && <Badge variant="secondary">Demo</Badge>}
        {isCapturing && !isDemoMode && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
            </span>
            Listening
          </span>
        )}
        {captureWarning && sessionActive && (
          <Badge variant="outline" className="text-muted-foreground">
            {captureWarning}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        {sessionActive ? (
          <Button variant="destructive" size="xl" onClick={onStop}>
            <Square />
            Stop
          </Button>
        ) : (
          <Button size="xl" onClick={onStartLive}>
            <MonitorPlay />
            Start listening
          </Button>
        )}

        {desktop && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={pinned ? "secondary" : "ghost"}
                size="icon-lg"
                aria-label={pinned ? "Unpin from top" : "Keep on top"}
                aria-pressed={pinned}
                onClick={togglePinned}
              >
                {pinned ? <PinOff /> : <Pin />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {pinned ? "Unpin from top" : "Keep on top"}
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Settings"
              onClick={onOpenSettings}
            >
              <Settings2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-lg" aria-label="More options">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onStartDemo}>
              <MonitorPlay />
              Play demo meeting
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onUpload}>
              <Upload />
              Upload a recording
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
