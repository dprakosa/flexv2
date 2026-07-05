import { DECISION_PATTERN } from "@/lib/catchup";
import type { CaptionChunk } from "@/types";

// Stricter than the recap TASK_PATTERN: bare "will"/"should" would color
// most of a normal meeting, so caption tagging requires a direct-ask or
// deadline shape.
const CAPTION_ACTION_PATTERN =
  /\b((can|could|would) you|needs? to|by (monday|tuesday|wednesday|thursday|friday|next week)|action item)\b/i;

// Live captions arrive from STT without meaning flags; tag them so the
// meaning colors work outside demo mode (decision wins over action).
// Flags already present (demo transcript) are never overridden.
export function tagCaptionChunk(chunk: CaptionChunk): CaptionChunk {
  if (chunk.isDecision !== undefined || chunk.isActionItem !== undefined) {
    return chunk;
  }

  if (DECISION_PATTERN.test(chunk.text)) {
    return { ...chunk, isDecision: true };
  }
  if (CAPTION_ACTION_PATTERN.test(chunk.text)) {
    return { ...chunk, isActionItem: true };
  }
  return chunk;
}

const FILLER_WORD_PATTERN =
  /\b(um+|uh+|like|you know|sort of|kind of|basically|actually)\b/gi;

export function stripFillerWords(text: string): string {
  return text
    .replace(FILLER_WORD_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}

export function getDisplayText(
  chunk: CaptionChunk,
  readingLevel: "original" | "grade8" | "grade6",
  reduceCognitiveLoad: boolean,
): string {
  const base =
    readingLevel === "original"
      ? chunk.text
      : chunk.simplifiedText ?? chunk.text;

  return reduceCognitiveLoad ? stripFillerWords(base) : base;
}

export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
