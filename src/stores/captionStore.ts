"use client";

import { create } from "zustand";

import { announce } from "@/components/StatusAnnouncer";
import { formatTimestamp } from "@/lib/captions";
import {
  deriveMeetingSignals,
  getSignalLabel,
  meetingSignalsEqual,
} from "@/lib/meeting-signals";
import {
  currentThreadsEqual,
  deriveCurrentThread,
} from "@/lib/current-thread";
import {
  formatTranscriptForPrompt,
  getTranscriptChunksForWindow,
  pruneTranscriptChunks,
  reconcileTranscriptChunk,
  reconcileTranscriptChunks,
  transcriptChunksFromCaptions,
} from "@/lib/transcript";
import type {
  CaptionChunk,
  ChatMessage,
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

const MAX_CHAT_MESSAGES = 200;
const MAX_SIGNAL_POSTS_PER_REFRESH = 3;

function trimChatMessages(chatMessages: ChatMessage[]): ChatMessage[] {
  return chatMessages.length > MAX_CHAT_MESSAGES
    ? chatMessages.slice(-MAX_CHAT_MESSAGES)
    : chatMessages;
}

// Same identity key dedupeSignals uses internally, so it is stable across
// the 10s re-derivation and the signal window aging out.
function signalKey(signal: MeetingSignal): string {
  return `${signal.type}:${signal.sourceChunkIds[0] ?? signal.timestamp}`;
}

// Posts newly detected signals into the chat thread exactly once per
// session. A later confidence upgrade does not repost — anti-spam wins.
function collectProactiveChatState(
  meetingSignals: MeetingSignal[],
  transcriptChunks: TranscriptChunk[],
  playbackTimeSec: number,
  chatMessages: ChatMessage[],
  postedSignalKeys: Record<string, true>,
) {
  const fresh = meetingSignals.filter(
    (signal) => !postedSignalKeys[signalKey(signal)],
  );
  if (fresh.length === 0) {
    return { chatMessages, postedSignalKeys };
  }

  const nextKeys: Record<string, true> = { ...postedSignalKeys };
  for (const signal of fresh) {
    nextKeys[signalKey(signal)] = true;
  }

  // Cap posts per refresh so a mid-session name change can't dump a
  // backlog into the chat; the overflow is marked posted silently.
  const toPost = [...fresh]
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-MAX_SIGNAL_POSTS_PER_REFRESH);

  const additions: ChatMessage[] = toPost.map((signal) => ({
    id: `signal:${signalKey(signal)}`,
    kind: "signal",
    signal,
    // Snapshot the quote now — the source chunk gets pruned later.
    sourceText: transcriptChunks.find(
      (chunk) => chunk.id === signal.sourceChunkIds[0],
    )?.text,
    atSec: playbackTimeSec,
  }));

  return {
    chatMessages: trimChatMessages([...chatMessages, ...additions]),
    postedSignalKeys: nextKeys,
  };
}

type DerivedMeetingState = Pick<
  CaptionState,
  "currentThread" | "meetingSignals" | "chatMessages" | "postedSignalKeys"
>;

function refreshDerivedMeetingState(
  transcriptChunks: TranscriptChunk[],
  playbackTimeSec: number,
  state: DerivedMeetingState,
) {
  const meetingSignals = refreshMeetingSignalsState(
    transcriptChunks,
    playbackTimeSec,
    state.meetingSignals,
  );

  return {
    currentThread: refreshCurrentThreadState(
      transcriptChunks,
      playbackTimeSec,
      state.currentThread,
    ),
    meetingSignals,
    ...collectProactiveChatState(
      meetingSignals,
      transcriptChunks,
      playbackTimeSec,
      state.chatMessages,
      state.postedSignalKeys,
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
  chatMessages: ChatMessage[];
  postedSignalKeys: Record<string, true>;
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
  getTranscriptChunksForWindow: (
    fromTimestamp: number,
    toTimestamp: number,
  ) => TranscriptChunk[];
  getTranscriptTextForWindow: (
    fromTimestamp: number,
    toTimestamp: number,
  ) => string;
  refreshMeetingSignals: () => void;
  appendChatMessage: (message: ChatMessage) => void;
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
  chatMessages: [] as ChatMessage[],
  postedSignalKeys: {} as Record<string, true>,
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
      );

      return {
        captions: [...state.captions, chunk],
        transcriptChunks: nextTranscriptChunks,
        ...refreshDerivedMeetingState(
          nextTranscriptChunks,
          state.playbackTimeSec,
          state,
        ),
      };
    }),
  setCaptions: (captions) =>
    set((state) => {
      const nextTranscriptChunks = pruneTranscriptChunks(
        transcriptChunksFromCaptions(captions),
        state.playbackTimeSec,
      );

      return {
        captions,
        transcriptChunks: nextTranscriptChunks,
        ...refreshDerivedMeetingState(
          nextTranscriptChunks,
          state.playbackTimeSec,
          state,
        ),
      };
    }),
  upsertTranscriptChunk: (chunk) =>
    set((state) => {
      const nextTranscriptChunks = pruneTranscriptChunks(
        reconcileTranscriptChunk(state.transcriptChunks, chunk),
        state.playbackTimeSec,
      );

      if (!chunk.isFinal) {
        return { transcriptChunks: nextTranscriptChunks };
      }

      return {
        transcriptChunks: nextTranscriptChunks,
        ...refreshDerivedMeetingState(
          nextTranscriptChunks,
          state.playbackTimeSec,
          state,
        ),
      };
    }),
  setTranscriptChunks: (chunks) =>
    set((state) => {
      const nextTranscriptChunks = pruneTranscriptChunks(
        reconcileTranscriptChunks([], chunks),
        state.playbackTimeSec,
      );

      return {
        transcriptChunks: nextTranscriptChunks,
        ...refreshDerivedMeetingState(
          nextTranscriptChunks,
          state.playbackTimeSec,
          state,
        ),
      };
    }),
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
    set((state) => {
      const meetingSignals = refreshMeetingSignalsState(
        state.transcriptChunks,
        state.playbackTimeSec,
        state.meetingSignals,
      );

      return {
        meetingSignals,
        ...collectProactiveChatState(
          meetingSignals,
          state.transcriptChunks,
          state.playbackTimeSec,
          state.chatMessages,
          state.postedSignalKeys,
        ),
      };
    }),
  appendChatMessage: (message) =>
    set((state) => ({
      chatMessages: trimChatMessages([...state.chatMessages, message]),
    })),
  setSummary: (summary) => set({ summary }),
  setPlaybackTimeSec: (playbackTimeSec) =>
    set((state) => {
      const nextTranscriptChunks = pruneTranscriptChunks(
        state.transcriptChunks,
        playbackTimeSec,
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
              state,
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

// Announce proactively posted signal cards once, from the store, so the
// heads-up doesn't depend on the chat panel being mounted. Message content
// itself is read by the chat's role="log" region.
useCaptionStore.subscribe((state, prevState) => {
  if (state.chatMessages === prevState.chatMessages) return;

  const newSignals = state.chatMessages
    .slice(prevState.chatMessages.length)
    .filter((message) => message.kind === "signal");
  const latest = newSignals.at(-1);
  if (!latest) return;

  announce(
    `Heads up: ${getSignalLabel(latest.signal).toLowerCase()} at ${formatTimestamp(latest.signal.timestamp)}`,
  );
});
