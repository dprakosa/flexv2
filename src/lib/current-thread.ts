import { DECISION_PATTERN } from "@/lib/catchup";
import { sortTranscriptChunks } from "@/lib/transcript";
import type { CurrentThread, TranscriptChunk } from "@/types";

export const CURRENT_THREAD_WINDOW_SEC = 180;
const MAX_TOPIC_CHARS = 120;
const MIN_QUESTION_CHARS = 12;
const MIN_TOPIC_CHARS = 16;

function trimForDisplay(text: string, maxChars = MAX_TOPIC_CHARS): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, maxChars - 1).trim()}…`;
}

function isOpenQuestion(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.endsWith("?") && trimmed.length >= MIN_QUESTION_CHARS;
}

function isDecisionText(text: string): boolean {
  return DECISION_PATTERN.test(text);
}

function isTopicCandidate(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.length >= MIN_TOPIC_CHARS &&
    !isOpenQuestion(trimmed) &&
    !isDecisionText(trimmed)
  );
}

export function deriveCurrentThread(
  chunks: TranscriptChunk[],
  currentTimeSec: number,
  windowSec = CURRENT_THREAD_WINDOW_SEC,
): CurrentThread {
  const windowStart = Math.max(0, currentTimeSec - windowSec);
  const recentFinal = sortTranscriptChunks(chunks).filter(
    (chunk) => chunk.isFinal && chunk.timestamp >= windowStart,
  );

  if (recentFinal.length === 0) {
    return {};
  }

  const lastDecision = [...recentFinal]
    .reverse()
    .find((chunk) => isDecisionText(chunk.text));

  const openQuestion = [...recentFinal]
    .reverse()
    .find((chunk) => isOpenQuestion(chunk.text));

  const topicSource = [...recentFinal]
    .reverse()
    .find((chunk) => isTopicCandidate(chunk.text));

  return {
    currentTopic: topicSource
      ? trimForDisplay(topicSource.text)
      : undefined,
    lastDecision: lastDecision
      ? trimForDisplay(lastDecision.text)
      : undefined,
    openQuestion: openQuestion
      ? trimForDisplay(openQuestion.text)
      : undefined,
    updatedAt: recentFinal[recentFinal.length - 1]?.timestamp,
  };
}

export function currentThreadsEqual(
  left: CurrentThread,
  right: CurrentThread,
): boolean {
  return (
    left.currentTopic === right.currentTopic &&
    left.lastDecision === right.lastDecision &&
    left.openQuestion === right.openQuestion
  );
}
