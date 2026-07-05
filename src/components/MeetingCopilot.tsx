"use client";

import { useEffect, useRef, useState } from "react";

import { Flag, Sparkles } from "lucide-react";

import { ActionItemsList } from "@/components/ActionItemsList";
import { AskTheMeeting } from "@/components/AskTheMeeting";
import { CaptionDisplay } from "@/components/CaptionDisplay";
import { CurrentThreadPanel } from "@/components/CurrentThreadPanel";
import { LostMarkerPill } from "@/components/LostMarkerPill";
import { MeetingHeader } from "@/components/MeetingHeader";
import { MissedSegmentModal } from "@/components/MissedSegmentModal";
import { SettingsSheet } from "@/components/SettingsSheet";
import { announce } from "@/components/StatusAnnouncer";
import { SummaryPanel } from "@/components/SummaryPanel";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DEMO_TRANSCRIPT,
  getDemoActionItemsUpTo,
  getDemoCaptionsUpTo,
  runDemoPlayback,
} from "@/lib/demo";
import { formatTimestamp } from "@/lib/captions";
import { isDesktop, onMarkLost } from "@/lib/desktop";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { useTranscription } from "@/hooks/useTranscription";
import { useCaptionStore } from "@/stores/captionStore";

function markLostAndAnnounce() {
  const store = useCaptionStore.getState();
  if (store.mode === "idle") return;

  store.markLost();
  const timestamp = useCaptionStore.getState().lostMarkerTimestamp;
  announce(
    timestamp === null
      ? "Lost marker set"
      : `Lost marker set at ${formatTimestamp(timestamp)}`,
  );
}

export function MeetingCopilot() {
  const [missedOpen, setMissedOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [demoEnded, setDemoEnded] = useState(false);
  const demoAbortRef = useRef<AbortController | null>(null);
  const clockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mode = useCaptionStore((state) => state.mode);
  const lostMarkerTimestamp = useCaptionStore(
    (state) => state.lostMarkerTimestamp,
  );
  const reset = useCaptionStore((state) => state.reset);
  const setMode = useCaptionStore((state) => state.setMode);
  const setIsCapturing = useCaptionStore((state) => state.setIsCapturing);
  const setIsDemoMode = useCaptionStore((state) => state.setIsDemoMode);
  const setCaptions = useCaptionStore((state) => state.setCaptions);
  const setActionItems = useCaptionStore((state) => state.setActionItems);
  const setSummary = useCaptionStore((state) => state.setSummary);
  const setPlaybackTimeSec = useCaptionStore(
    (state) => state.setPlaybackTimeSec,
  );
  const setSessionStartedAtMs = useCaptionStore(
    (state) => state.setSessionStartedAtMs,
  );

  const {
    warning,
    startTabCapture,
    startMicFallback,
    startFileCapture,
    stopCapture,
  } = useAudioCapture();
  const transcription = useTranscription();

  const stopSessionClock = () => {
    if (clockIntervalRef.current !== null) {
      clearInterval(clockIntervalRef.current);
      clockIntervalRef.current = null;
    }

    setSessionStartedAtMs(null);
  };

  const startSessionClock = () => {
    stopSessionClock();

    const startedAtMs = Date.now();
    setSessionStartedAtMs(startedAtMs);
    setPlaybackTimeSec(0);

    clockIntervalRef.current = setInterval(() => {
      setPlaybackTimeSec((Date.now() - startedAtMs) / 1000);
    }, 500);
  };

  const stopSession = () => {
    const wasActive = useCaptionStore.getState().mode !== "idle";
    demoAbortRef.current?.abort();
    demoAbortRef.current = null;
    stopSessionClock();
    transcription.stop();
    stopCapture();
    reset();
    setDemoEnded(false);
    if (wasActive) announce("Stopped listening");
  };

  useEffect(() => {
    return () => {
      demoAbortRef.current?.abort();

      if (clockIntervalRef.current !== null) {
        clearInterval(clockIntervalRef.current);
      }
    };
  }, []);

  // Global shortcut (Ctrl/Cmd+Shift+L) from the desktop shell.
  useEffect(() => {
    return onMarkLost(markLostAndAnnounce);
  }, []);

  // In-app keyboard shortcut: L (web also gets Ctrl+Shift+L; on desktop the
  // OS-level shortcut owns that combo).
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.defaultPrevented) return;
      if (event.key !== "l" && event.key !== "L") return;

      const plainL = !event.ctrlKey && !event.metaKey && !event.altKey;
      const comboL =
        event.ctrlKey && event.shiftKey && !event.metaKey && !isDesktop();
      if (!plainL && !comboL) return;

      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, select, [contenteditable=true], [role=dialog]",
        )
      ) {
        return;
      }

      event.preventDefault();
      markLostAndAnnounce();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (warning) announce(warning);
  }, [warning]);

  const startDemo = async () => {
    stopSession();
    setMode("demo");
    setIsDemoMode(true);
    setIsCapturing(true);
    setSummary({
      text: DEMO_TRANSCRIPT.summary,
      updatedAt: Date.now(),
      coversFromTimestamp: 0,
    });
    announce("Demo started");

    const controller = new AbortController();
    demoAbortRef.current = controller;

    await runDemoPlayback((timeSec) => {
      setPlaybackTimeSec(timeSec);
      setCaptions(getDemoCaptionsUpTo(timeSec));
      setActionItems(getDemoActionItemsUpTo(timeSec));
    }, controller.signal);

    setIsCapturing(false);

    if (!controller.signal.aborted) {
      setDemoEnded(true);
      announce("Demo finished. Start listening or replay the demo.");
    }
  };

  const startLive = async () => {
    stopSession();
    setMode("live");
    setIsDemoMode(false);

    try {
      const mediaStream = await startTabCapture();
      let audioStream = mediaStream;
      if (mediaStream.getAudioTracks().length === 0) {
        audioStream = await startMicFallback();
      }
      setIsCapturing(true);
      startSessionClock();
      announce("Listening started");
      void transcription.start(audioStream);
    } catch (err) {
      setMode("idle");
      if (err instanceof Error && err.message) announce(err.message);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    stopSession();
    setMode("upload");
    setIsDemoMode(false);

    try {
      await startFileCapture(file);
      setIsCapturing(true);
      startSessionClock();
      // Phase 1: send uploaded file to STT pipeline.
    } catch {
      setMode("idle");
    }

    event.target.value = "";
  };

  const sessionActive = mode !== "idle";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <MeetingHeader
        captureWarning={transcription.error ?? warning}
        onStartDemo={startDemo}
        onStartLive={startLive}
        onStop={stopSession}
        onUpload={handleUploadClick}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*,.mp4,.wav,.webm"
        className="hidden"
        onChange={handleFileChange}
      />

      <main className="mx-auto grid w-full max-w-6xl min-h-0 flex-1 grid-cols-1 content-start gap-4 overflow-y-auto px-4 pt-2 pb-28 lg:grid-cols-[minmax(0,1fr)_360px] lg:content-stretch lg:overflow-hidden">
        <div className="flex flex-col gap-4 lg:min-h-0">
          <SummaryPanel />
          <CaptionDisplay />
          {demoEnded && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 text-card-foreground shadow-sm">
              <p className="text-sm">
                Demo finished — start listening or replay the demo.
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={startLive}>
                  Start listening
                </Button>
                <Button size="sm" variant="ghost" onClick={startDemo}>
                  Replay demo
                </Button>
              </div>
            </div>
          )}
        </div>

        <aside
          aria-label="Meeting information"
          className="flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:pr-1"
        >
          <CurrentThreadPanel />
          <AskTheMeeting onOpenCatchUp={() => setMissedOpen(true)} />
          <ActionItemsList />
        </aside>
      </main>

      <div className="fixed inset-x-0 bottom-6 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-2 rounded-full border bg-background/80 p-2 shadow-lg backdrop-blur">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="xl"
              variant={lostMarkerTimestamp === null ? "default" : "secondary"}
              disabled={!sessionActive}
              aria-pressed={lostMarkerTimestamp !== null}
              aria-keyshortcuts="l"
              onClick={markLostAndAnnounce}
            >
              <Flag aria-hidden />
              I&apos;m lost
            </Button>
          </TooltipTrigger>
          <TooltipContent>Mark where you lost the thread (press L)</TooltipContent>
        </Tooltip>
        <LostMarkerPill />
        <Button
          size="xl"
          variant={lostMarkerTimestamp === null ? "secondary" : "default"}
          disabled={!sessionActive}
          onClick={() => setMissedOpen(true)}
        >
          <Sparkles aria-hidden />
          Catch me up
        </Button>
      </div>

      <MissedSegmentModal open={missedOpen} onOpenChange={setMissedOpen} />
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
