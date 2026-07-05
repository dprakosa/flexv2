"use client";

import { useCallback, useEffect, useRef } from "react";

import { useCaptionStore } from "@/stores/captionStore";

export function useTranscription() {
  const {
    isCapturing,
    mode,
    addCaption,
    upsertTranscriptChunk,
    setIsCapturing,
  } = useCaptionStore();
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setIsCapturing(true);

    // Phase 1: wire Deepgram / AssemblyAI streaming STT here.
  }, [setIsCapturing]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsCapturing(false);
  }, [setIsCapturing]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    isCapturing,
    mode,
    start,
    stop,
    addCaption,
    upsertTranscriptChunk,
  };
}
