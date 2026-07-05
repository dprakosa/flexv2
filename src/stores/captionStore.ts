"use client";

import { create } from "zustand";

import {
  deriveMeetingSignals,
  meetingSignalsEqual,
} from "@/lib/meeting-signals";
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
  CaptionChunk,
  CurrentThread,
  MeetingMode,
  MeetingSignal,
  MeetingSummary,
  TranscriptChunk,
} from "@/types";
import { useSettingsStore } from "@/stores/settingsStore";

function refreshCurrentThreadState(
  transcriptChunks: TranscriptChunk[],
  playbackTimeSec: number,
  currentThread: CurrentThread,
): CurrentThread {
  const next = deriveCurrentThread(transcriptChunks, playbackTimeSec);
  return currentThreadsEqual(currentThread, next) ? currentThread : next;
}

function refreshMeetingSignalsState(
  transcriptChunks: TranscriptChunk[],
  playbackTimeSec: number,
  meetingSignals: MeetingSignal[],
): MeetingSignal[] {
  const userName = useSettingsStore.getState().userName;
  const next = deriveMeetingSignals(
    transcriptChunks,
    userName,
    playbackTimeSec,
  );
  return meetingSignalsEqual(meetingSignals, next) ? meetingSignals : next;
}

function refreshDerivedMeetingState(
  transcriptChunks: TranscriptChunk[],
  playbackTimeSec: number,
  currentThread: CurrentThread,
  meetingSignals: MeetingSignal[],
) {
  return {
    currentThread: refreshCurrentThreadState(
      transcriptChunks,
      playbackTimeSec,
      currentThread,
    ),
    meetingSignals: refreshMeetingSignalsState(
      transcriptChunks,
      playbackTimeSec,
      meetingSignals,
    ),
  };
}

type CaptionState = {
  mode: MeetingMode;
  isCapturing: boolean;
  isDemoMode: boolean;
  captions: CaptionChunk[];
  transcriptChunks: TranscriptChunk[];
  currentThread: CurrentThread;
  meetingSignals: MeetingSignal[];
  lostMarkerTimestamp: number | null;
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
  refreshMeetingSignals: () => void;
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
  meetingSignals: [] as MeetingSignal[],
  lostMarkerTimestamp: null as number | null,
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
        ...refreshDerivedMeetingState(
          nextTranscriptChunks,
          state.playbackTimeSec,
          state.currentThread,
          state.meetingSignals,
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
        ...refreshDerivedMeetingState(
          nextTranscriptChunks,
          state.playbackTimeSec,
          state.currentThread,
          state.meetingSignals,
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
        ...refreshDerivedMeetingState(
          nextTranscriptChunks,
          state.playbackTimeSec,
          state.currentThread,
          state.meetingSignals,
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
        ...refreshDerivedMeetingState(
          nextTranscriptChunks,
          state.playbackTimeSec,
          state.currentThread,
          state.meetingSignals,
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
  refreshMeetingSignals: () =>
    set((state) => ({
      meetingSignals: refreshMeetingSignalsState(
        state.transcriptChunks,
        state.playbackTimeSec,
        state.meetingSignals,
      ),
    })),
  setSummary: (summary) => set({ summary }),
  setPlaybackTimeSec: (playbackTimeSec) =>
    set((state) => {
      const nextTranscriptChunks = pruneTranscriptChunks(
        state.transcriptChunks,
        playbackTimeSec,
        state.lostMarkerTimestamp,
      );

      // Derived state only ages out on 180s windows, so recomputing it on
      // every 500ms tick is wasted work (chunk changes refresh immediately
      // elsewhere). Re-derive at 10s granularity instead.
      const crossedRefreshBoundary =
        Math.floor(playbackTimeSec / 10) !==
        Math.floor(state.playbackTimeSec / 10);

      return {
        playbackTimeSec,
        transcriptChunks: nextTranscriptChunks,
        ...(crossedRefreshBoundary
          ? refreshDerivedMeetingState(
              nextTranscriptChunks,
              playbackTimeSec,
              state.currentThread,
              state.meetingSignals,
            )
          : {}),
      };
    }),
  setSessionStartedAtMs: (sessionStartedAtMs) => set({ sessionStartedAtMs }),
  reset: () => set(INITIAL_STATE),
}));

// Signals depend on the user's name; re-derive when it changes so the
// refresh doesn't rely on any particular component staying mounted.
useSettingsStore.subscribe((state, prevState) => {
  if (state.userName !== prevState.userName) {
    useCaptionStore.getState().refreshMeetingSignals();
  }
});
