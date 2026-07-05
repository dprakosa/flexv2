"use client";

import { create } from "zustand";

import {
  currentThreadsEqual,
  deriveCurrentThread,
} from "@/lib/current-thread";
import {
  formatTranscriptForPrompt,
  getCatchUpWindow as resolveCatchUpWindow,
  getTranscriptChunksForWindow,
  pruneTranscriptChunks,
  reconcileTranscriptChunk,
  reconcileTranscriptChunks,
  transcriptChunksFromCaptions,
  type CatchUpWindow,
} from "@/lib/transcript";
import type {
  ActionItem,
  CaptionChunk,
  CurrentThread,
  MeetingMode,
  MeetingSummary,
  TranscriptChunk,
} from "@/types";

function refreshCurrentThreadState(
  transcriptChunks: TranscriptChunk[],
  playbackTimeSec: number,
  currentThread: CurrentThread,
): CurrentThread {
  const next = deriveCurrentThread(transcriptChunks, playbackTimeSec);
  return currentThreadsEqual(currentThread, next) ? currentThread : next;
}

type CaptionState = {
  mode: MeetingMode;
  isCapturing: boolean;
  isDemoMode: boolean;
  captions: CaptionChunk[];
  transcriptChunks: TranscriptChunk[];
  currentThread: CurrentThread;
  lostMarkerTimestamp: number | null;
  actionItems: ActionItem[];
  summary: MeetingSummary | null;
  playbackTimeSec: number;
  sessionStartedAtMs: number | null;
  setMode: (mode: MeetingMode) => void;
  setIsCapturing: (isCapturing: boolean) => void;
  setIsDemoMode: (isDemoMode: boolean) => void;
  addCaption: (chunk: CaptionChunk) => void;
  setCaptions: (captions: CaptionChunk[]) => void;
  upsertTranscriptChunk: (chunk: TranscriptChunk) => void;
  setTranscriptChunks: (chunks: TranscriptChunk[]) => void;
  markLost: (timestamp?: number) => void;
  clearLostMarker: () => void;
  getCatchUpWindow: () => CatchUpWindow;
  getTranscriptChunksForWindow: (
    fromTimestamp: number,
    toTimestamp: number,
  ) => TranscriptChunk[];
  getTranscriptTextForWindow: (
    fromTimestamp: number,
    toTimestamp: number,
  ) => string;
  setActionItems: (actionItems: ActionItem[]) => void;
  setSummary: (summary: MeetingSummary | null) => void;
  setPlaybackTimeSec: (playbackTimeSec: number) => void;
  setSessionStartedAtMs: (sessionStartedAtMs: number | null) => void;
  reset: () => void;
};

const INITIAL_STATE = {
  mode: "idle" as MeetingMode,
  isCapturing: false,
  isDemoMode: false,
  captions: [] as CaptionChunk[],
  transcriptChunks: [] as TranscriptChunk[],
  currentThread: {} as CurrentThread,
  lostMarkerTimestamp: null as number | null,
  actionItems: [] as ActionItem[],
  summary: null as MeetingSummary | null,
  playbackTimeSec: 0,
  sessionStartedAtMs: null as number | null,
};

export const useCaptionStore = create<CaptionState>((set, get) => ({
  ...INITIAL_STATE,
  setMode: (mode) => set({ mode }),
  setIsCapturing: (isCapturing) => set({ isCapturing }),
  setIsDemoMode: (isDemoMode) => set({ isDemoMode }),
  addCaption: (chunk) =>
    set((state) => {
      const transcriptChunks = reconcileTranscriptChunk(
        state.transcriptChunks,
        {
          id: chunk.id,
          text: chunk.text,
          timestamp: chunk.timestamp,
          isFinal: true,
        },
      );

      const nextTranscriptChunks = pruneTranscriptChunks(
        transcriptChunks,
        state.playbackTimeSec,
        state.lostMarkerTimestamp,
      );

      return {
        captions: [...state.captions, chunk],
        transcriptChunks: nextTranscriptChunks,
        currentThread: refreshCurrentThreadState(
          nextTranscriptChunks,
          state.playbackTimeSec,
          state.currentThread,
        ),
      };
    }),
  setCaptions: (captions) =>
    set((state) => {
      const nextTranscriptChunks = pruneTranscriptChunks(
        transcriptChunksFromCaptions(captions),
        state.playbackTimeSec,
        state.lostMarkerTimestamp,
      );

      return {
        captions,
        transcriptChunks: nextTranscriptChunks,
        currentThread: refreshCurrentThreadState(
          nextTranscriptChunks,
          state.playbackTimeSec,
          state.currentThread,
        ),
      };
    }),
  upsertTranscriptChunk: (chunk) =>
    set((state) => {
      const nextTranscriptChunks = pruneTranscriptChunks(
        reconcileTranscriptChunk(state.transcriptChunks, chunk),
        state.playbackTimeSec,
        state.lostMarkerTimestamp,
      );

      if (!chunk.isFinal) {
        return { transcriptChunks: nextTranscriptChunks };
      }

      return {
        transcriptChunks: nextTranscriptChunks,
        currentThread: refreshCurrentThreadState(
          nextTranscriptChunks,
          state.playbackTimeSec,
          state.currentThread,
        ),
      };
    }),
  setTranscriptChunks: (chunks) =>
    set((state) => {
      const nextTranscriptChunks = pruneTranscriptChunks(
        reconcileTranscriptChunks([], chunks),
        state.playbackTimeSec,
        state.lostMarkerTimestamp,
      );

      return {
        transcriptChunks: nextTranscriptChunks,
        currentThread: refreshCurrentThreadState(
          nextTranscriptChunks,
          state.playbackTimeSec,
          state.currentThread,
        ),
      };
    }),
  markLost: (timestamp) =>
    set((state) => ({
      lostMarkerTimestamp:
        timestamp ??
        (state.sessionStartedAtMs === null
          ? state.playbackTimeSec
          : (Date.now() - state.sessionStartedAtMs) / 1000),
    })),
  clearLostMarker: () =>
    set((state) => ({
      lostMarkerTimestamp: null,
      transcriptChunks: pruneTranscriptChunks(
        state.transcriptChunks,
        state.playbackTimeSec,
        null,
      ),
    })),
  getCatchUpWindow: () => {
    const state = get();
    return resolveCatchUpWindow(
      state.playbackTimeSec,
      state.lostMarkerTimestamp,
    );
  },
  getTranscriptChunksForWindow: (fromTimestamp, toTimestamp) => {
    const state = get();
    return getTranscriptChunksForWindow(
      state.transcriptChunks,
      fromTimestamp,
      toTimestamp,
    );
  },
  getTranscriptTextForWindow: (fromTimestamp, toTimestamp) => {
    const state = get();
    return formatTranscriptForPrompt(
      getTranscriptChunksForWindow(
        state.transcriptChunks,
        fromTimestamp,
        toTimestamp,
      ),
    );
  },
  setActionItems: (actionItems) => set({ actionItems }),
  setSummary: (summary) => set({ summary }),
  setPlaybackTimeSec: (playbackTimeSec) =>
    set((state) => {
      const nextTranscriptChunks = pruneTranscriptChunks(
        state.transcriptChunks,
        playbackTimeSec,
        state.lostMarkerTimestamp,
      );

      return {
        playbackTimeSec,
        transcriptChunks: nextTranscriptChunks,
        currentThread: refreshCurrentThreadState(
          nextTranscriptChunks,
          playbackTimeSec,
          state.currentThread,
        ),
      };
    }),
  setSessionStartedAtMs: (sessionStartedAtMs) => set({ sessionStartedAtMs }),
  reset: () => set(INITIAL_STATE),
}));
