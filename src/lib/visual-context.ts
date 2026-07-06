import { DECISION_PATTERN } from "@/lib/catchup";
import { sortTranscriptChunks } from "@/lib/transcript";
import type { TranscriptChunk, VisualContextResult } from "@/types";

// Minimum chars a topic needs before it's worth a search call at all.
export const MIN_TOPIC_CHARS_FOR_SEARCH = 16;

// How many SerpAPI results to fetch and score with CLIP before picking one.
export const SEARCH_CANDIDATE_COUNT = 6;

// Minimum CLIP cosine similarity for the top-ranked candidate to actually be
// shown. Below this, nothing is shown rather than a low-confidence guess.
// TODO(calibration): starting value, tune against real query/image pairs.
export const CLIP_MIN_SIMILARITY = 0.24;

// How far back to look for a topic candidate. current-thread.ts used the
// same window before it was removed in the chat-panel redesign; this
// widget derives its own lightweight topic locally instead of depending
// on a shared "current thread" concept that no longer exists in the store.
const TOPIC_WINDOW_SEC = 180;

function isOpenQuestion(text: string): boolean {
  return text.trim().endsWith("?");
}

export function deriveCurrentTopic(
  chunks: TranscriptChunk[],
  currentTimeSec: number,
  windowSec = TOPIC_WINDOW_SEC,
): string | undefined {
  const windowStart = Math.max(0, currentTimeSec - windowSec);
  const recentFinal = sortTranscriptChunks(chunks).filter(
    (chunk) => chunk.isFinal && chunk.timestamp >= windowStart,
  );

  const topicSource = [...recentFinal].reverse().find((chunk) => {
    const text = chunk.text.trim();
    return (
      text.length >= MIN_TOPIC_CHARS_FOR_SEARCH &&
      !isOpenQuestion(text) &&
      !DECISION_PATTERN.test(text)
    );
  });

  return topicSource?.text.trim();
}

export function buildVisualContextResult(
  query: string,
  candidate: { imageUrl: string; sourceUrl: string } | undefined,
): VisualContextResult | null {
  if (!candidate) return null;

  return {
    query,
    imageUrl: candidate.imageUrl,
    sourceUrl: candidate.sourceUrl,
    caption: query,
  };
}
