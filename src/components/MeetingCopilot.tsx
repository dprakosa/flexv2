"use client";

import { useEffect, useRef, useState } from "react";

import { Flag, Sparkles } from "lucide-react";

import { CaptionDisplay } from "@/components/CaptionDisplay";
import { LostMarkerPill } from "@/components/LostMarkerPill";
import { MeetingHeader } from "@/components/MeetingHeader";
import { MissedSegmentModal } from "@/components/MissedSegmentModal";
import { SettingsSheet } from "@/components/SettingsSheet";
import { SummaryPanel } from "@/components/SummaryPanel";
import { Button } from "@/components/ui/button";
import {
  DEMO_TRANSCRIPT,
  getDemoActionItemsUpTo,
  getDemoCaptionsUpTo,
  runDemoPlayback,
} from "@/lib/demo";
import { onMarkLost } from "@/lib/desktop";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { useCaptionStore } from "@/stores/captionStore";

export function MeetingCopilot() {
  const [missedOpen, setMissedOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  const markLost = useCaptionStore((state) => state.markLost);

  const { warning, startTabCapture, startFileCapture, stopCapture } =
    useAudioCapture();

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
    demoAbortRef.current?.abort();
    demoAbortRef.current = null;
    stopSessionClock();
    stopCapture();
    reset();
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
    return onMarkLost(() => {
      const state = useCaptionStore.getState();
      if (state.mode !== "idle") {
        state.markLost();
      }
    });
  }, []);

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

    const controller = new AbortController();
    demoAbortRef.current = controller;

    await runDemoPlayback((timeSec) => {
      setPlaybackTimeSec(timeSec);
      setCaptions(getDemoCaptionsUpTo(timeSec));
      setActionItems(getDemoActionItemsUpTo(timeSec));
    }, controller.signal);

    setIsCapturing(false);
  };

  const startLive = async () => {
    stopSession();
    setMode("live");
    setIsDemoMode(false);

    try {
      await startTabCapture();
      setIsCapturing(true);
      startSessionClock();
      // Phase 1: connect tab audio stream to STT pipeline.
    } catch {
      setMode("idle");
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
        captureWarning={warning}
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

      <main className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col gap-4 px-4 pt-2 pb-28">
        <SummaryPanel />
        <CaptionDisplay />
      </main>

      <div className="fixed inset-x-0 bottom-6 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-2 rounded-full border bg-background/80 p-2 shadow-lg backdrop-blur">
        <Button
          size="xl"
          variant={lostMarkerTimestamp === null ? "default" : "secondary"}
          disabled={!sessionActive}
          onClick={() => markLost()}
        >
          <Flag />
          I&apos;m lost
        </Button>
        <LostMarkerPill />
        <Button
          size="xl"
          variant="secondary"
          disabled={!sessionActive}
          onClick={() => setMissedOpen(true)}
        >
          <Sparkles />
          Catch me up
        </Button>
      </div>

      <MissedSegmentModal open={missedOpen} onOpenChange={setMissedOpen} />
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
