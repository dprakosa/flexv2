"use client";

import { create } from "zustand";

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
  MeetingMode,
  MeetingSummary,
  TranscriptChunk,
} from "@/types";

type CaptionState = {
  mode: MeetingMode;
  isCapturing: boolean;
  isDemoMode: boolean;
  captions: CaptionChunk[];
  transcriptChunks: TranscriptChunk[];
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

      return {
        captions: [...state.captions, chunk],
        transcriptChunks: pruneTranscriptChunks(
          transcriptChunks,
          state.playbackTimeSec,
          state.lostMarkerTimestamp,
        ),
      };
    }),
  setCaptions: (captions) =>
    set((state) => ({
      captions,
      transcriptChunks: pruneTranscriptChunks(
        transcriptChunksFromCaptions(captions),
        state.playbackTimeSec,
        state.lostMarkerTimestamp,
      ),
    })),
  upsertTranscriptChunk: (chunk) =>
    set((state) => ({
      transcriptChunks: pruneTranscriptChunks(
        reconcileTranscriptChunk(state.transcriptChunks, chunk),
        state.playbackTimeSec,
        state.lostMarkerTimestamp,
      ),
    })),
  setTranscriptChunks: (chunks) =>
    set((state) => ({
      transcriptChunks: pruneTranscriptChunks(
        reconcileTranscriptChunks([], chunks),
        state.playbackTimeSec,
        state.lostMarkerTimestamp,
      ),
    })),
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
    set((state) => ({
      playbackTimeSec,
      transcriptChunks: pruneTranscriptChunks(
        state.transcriptChunks,
        playbackTimeSec,
        state.lostMarkerTimestamp,
      ),
    })),
  setSessionStartedAtMs: (sessionStartedAtMs) => set({ sessionStartedAtMs }),
  reset: () => set(INITIAL_STATE),
}));
