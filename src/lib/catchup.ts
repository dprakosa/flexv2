import type { CatchUpCard, MentionStatus } from "@/types";

const MAX_LIST_ITEMS = 4;

// Strict structured-output schema: every property required,
// optionals modeled as null unions. Timestamps are stamped server-side,
// so the model never outputs them.
export const CATCH_UP_CARD_SCHEMA = {
  type: "object",
  properties: {
    currentTopic: {
      type: ["string", "null"],
      description:
        "The topic being discussed at the end of the window, in a few plain words. Null if unclear.",
    },
    whatChanged: {
      type: "array",
      items: { type: "string" },
      description:
        "At most 4 items. One short sentence each describing what moved forward in this window.",
    },
    decisions: {
      type: "array",
      items: { type: "string" },
      description:
        "At most 4 items. Decisions explicitly made in this window, one short sentence each. Append a short quoted transcript snippet in double quotes when it helps verification.",
    },
    possibleTasksForUser: {
      type: "array",
      items: { type: "string" },
      description:
        'At most 4 items. Tasks that could plausibly be for the participant. Start each with "Possible task:" and include a short quoted snippet as evidence.',
    },
    openQuestions: {
      type: "array",
      items: { type: "string" },
      description:
        "At most 4 items. Questions raised in this window that were not answered.",
    },
    userMentions: {
      type: "array",
      items: { type: "string" },
      description:
        "Short quoted transcript snippets where the participant is named or directly addressed. Empty if none.",
    },
    mentionStatus: {
      type: "string",
      enum: ["clearly_mentioned", "possibly_mentioned", "not_mentioned"],
      description:
        '"clearly_mentioned" only with direct evidence; "possibly_mentioned" for ambiguous references; otherwise "not_mentioned".',
    },
    suggestedQuestion: {
      type: ["string", "null"],
      description:
        "One short, natural question the participant could ask aloud to rejoin the conversation. Null if nothing fits.",
    },
  },
  required: [
    "currentTopic",
    "whatChanged",
    "decisions",
    "possibleTasksForUser",
    "openQuestions",
    "userMentions",
    "mentionStatus",
    "suggestedQuestion",
  ],
  additionalProperties: false,
} as const;

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_LIST_ITEMS);
}

function cleanOptional(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

const MENTION_STATUSES: MentionStatus[] = [
  "clearly_mentioned",
  "possibly_mentioned",
  "not_mentioned",
];

export function normalizeCatchUpCard(
  raw: unknown,
  fromTimestamp: number,
  toTimestamp: number,
): CatchUpCard {
  const data = (raw ?? {}) as Record<string, unknown>;

  return {
    fromTimestamp,
    toTimestamp,
    currentTopic: cleanOptional(data.currentTopic),
    whatChanged: cleanList(data.whatChanged),
    decisions: cleanList(data.decisions),
    possibleTasksForUser: cleanList(data.possibleTasksForUser),
    openQuestions: cleanList(data.openQuestions),
    userMentions: cleanList(data.userMentions),
    mentionStatus: MENTION_STATUSES.includes(
      data.mentionStatus as MentionStatus,
    )
      ? (data.mentionStatus as MentionStatus)
      : "not_mentioned",
    suggestedQuestion: cleanOptional(data.suggestedQuestion),
  };
}

const DECISION_PATTERN =
  /\b(decid\w*|let'?s (keep|go with|stick with)|we('re| are) (keeping|going with))\b/i;
const TASK_PATTERN =
  /\b(will|needs? to|should|can you|by (monday|tuesday|wednesday|thursday|friday|next week))\b/i;

function stripOffsets(line: string): string {
  return line.replace(/^\[\d+(\.\d+)?s\]\s*/, "").trim();
}

// Deterministic fallback used when no OpenAI key is configured, so demo
// mode and fresh checkouts still show a structured card.
export function buildSampleCatchUpCard(
  transcript: string,
  fromTimestamp: number,
  toTimestamp: number,
  userName?: string,
): CatchUpCard {
  const lines = transcript
    .split("\n")
    .map(stripOffsets)
    .filter(Boolean);

  const decisions = lines.filter((line) => DECISION_PATTERN.test(line));
  const tasks = lines
    .filter((line) => TASK_PATTERN.test(line) && !decisions.includes(line))
    .map((line) => `Possible task: "${line}"`);
  const openQuestions = lines.filter((line) => line.endsWith("?"));

  const name = userName?.trim();
  const mentions = name
    ? lines
        .filter((line) => line.toLowerCase().includes(name.toLowerCase()))
        .map((line) => `"${line}"`)
    : [];

  return {
    fromTimestamp,
    toTimestamp,
    currentTopic: undefined,
    whatChanged: lines.slice(-3).reverse(),
    decisions: decisions.slice(0, MAX_LIST_ITEMS),
    possibleTasksForUser: tasks.slice(0, MAX_LIST_ITEMS),
    openQuestions: openQuestions.slice(0, MAX_LIST_ITEMS),
    userMentions: mentions.slice(0, MAX_LIST_ITEMS),
    mentionStatus: mentions.length > 0 ? "possibly_mentioned" : "not_mentioned",
    suggestedQuestion: undefined,
  };
}

export function buildEmptyCatchUpCard(
  fromTimestamp: number,
  toTimestamp: number,
): CatchUpCard {
  return {
    fromTimestamp,
    toTimestamp,
    whatChanged: [],
    decisions: [],
    possibleTasksForUser: [],
    openQuestions: [],
    userMentions: [],
    mentionStatus: "not_mentioned",
  };
}
