import type { CaptionChunk, TranscriptChunk } from "@/types";

export const TRANSCRIPT_RETENTION_WINDOW_SEC = 30 * 60;

function normalizeTimestamp(timestamp: number): number {
  return Number.isFinite(timestamp) ? Math.max(0, timestamp) : 0;
}

function normalizeChunk(chunk: TranscriptChunk): TranscriptChunk {
  return {
    ...chunk,
    text: chunk.text.trim(),
    timestamp: normalizeTimestamp(chunk.timestamp),
  };
}

export function sortTranscriptChunks(
  chunks: TranscriptChunk[],
): TranscriptChunk[] {
  return [...chunks].sort((a, b) => {
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }

    return a.id.localeCompare(b.id);
  });
}

export function reconcileTranscriptChunk(
  chunks: TranscriptChunk[],
  incomingChunk: TranscriptChunk,
): TranscriptChunk[] {
  const incoming = normalizeChunk(incomingChunk);

  if (!incoming.id || !incoming.text) {
    return chunks;
  }

  const existingIndex = chunks.findIndex((chunk) => chunk.id === incoming.id);

  if (existingIndex === -1) {
    return sortTranscriptChunks([...chunks, incoming]);
  }

  const existing = chunks[existingIndex];

  if (existing.isFinal && !incoming.isFinal) {
    return chunks;
  }

  const next = [...chunks];
  next[existingIndex] = {
    ...existing,
    ...incoming,
    isFinal: existing.isFinal || incoming.isFinal,
  };

  return sortTranscriptChunks(next);
}

export function reconcileTranscriptChunks(
  chunks: TranscriptChunk[],
  incomingChunks: TranscriptChunk[],
): TranscriptChunk[] {
  return incomingChunks.reduce(reconcileTranscriptChunk, chunks);
}

export function pruneTranscriptChunks(
  chunks: TranscriptChunk[],
  currentTimeSec: number,
  retentionWindowSec = TRANSCRIPT_RETENTION_WINDOW_SEC,
): TranscriptChunk[] {
  const retainedStart = Math.max(
    0,
    normalizeTimestamp(currentTimeSec) - retentionWindowSec,
  );

  return chunks.filter((chunk) => chunk.timestamp >= retainedStart);
}

export function getTranscriptChunksForWindow(
  chunks: TranscriptChunk[],
  fromTimestamp: number,
  toTimestamp: number,
): TranscriptChunk[] {
  const from = normalizeTimestamp(fromTimestamp);
  const to = normalizeTimestamp(toTimestamp);

  return sortTranscriptChunks(
    chunks.filter(
      (chunk) => chunk.timestamp >= from && chunk.timestamp <= to,
    ),
  );
}

export function formatTranscriptForPrompt(chunks: TranscriptChunk[]): string {
  return sortTranscriptChunks(chunks)
    .map((chunk) => `[${Math.floor(chunk.timestamp)}s] ${chunk.text}`)
    .join("\n");
}

export function captionToTranscriptChunk(
  chunk: CaptionChunk,
): TranscriptChunk {
  return {
    id: chunk.id,
    text: chunk.text,
    timestamp: chunk.timestamp,
    isFinal: true,
  };
}

export function transcriptChunksFromCaptions(
  captions: CaptionChunk[],
): TranscriptChunk[] {
  return reconcileTranscriptChunks([], captions.map(captionToTranscriptChunk));
}
