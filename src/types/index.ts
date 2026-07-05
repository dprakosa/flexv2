export type ReadingLevel = "original" | "grade8" | "grade6";

export type ThemePreset =
  | "calm-light"
  | "calm-dark"
  | "high-contrast"
  | "dyslexia";

export type TextScale = "default" | "large" | "x-large";

export type MeetingMode = "idle" | "demo" | "live" | "upload";

export type CaptionChunk = {
  id: string;
  speaker: string;
  text: string;
  simplifiedText?: string;
  timestamp: number;
  isActionItem?: boolean;
  isDecision?: boolean;
};

export type TranscriptChunk = {
  id: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
};

export type CurrentThread = {
  currentTopic?: string;
  lastDecision?: string;
  openQuestion?: string;
  updatedAt?: number;
};

export type MeetingSignal = {
  type: "topic" | "decision" | "task" | "question" | "mention";
  text: string;
  timestamp: number;
  confidence: "low" | "medium" | "high";
  sourceChunkIds: string[];
};

export type UserAccessibilitySettings = {
  userName: string;
  themePreset: ThemePreset;
  textScale: TextScale;
  readingLevel: ReadingLevel;
  captionDelaySec: number;
  reduceCognitiveLoad: boolean;
};

export type MeetingSummary = {
  text: string;
  updatedAt: number;
  coversFromTimestamp: number;
};

export type MentionStatus =
  | "clearly_mentioned"
  | "possibly_mentioned"
  | "not_mentioned";

export type CatchUpCard = {
  fromTimestamp: number;
  toTimestamp: number;
  currentTopic?: string;
  whatChanged: string[];
  decisions: string[];
  possibleTasksForUser: string[];
  openQuestions: string[];
  userMentions: string[];
  mentionStatus: MentionStatus;
  suggestedQuestion?: string;
};

export type MissedSegmentRequest = {
  fromTimestamp: number;
  toTimestamp: number;
  transcript?: string;
  userName?: string;
  usesLostMarker?: boolean;
};

export type MissedSegmentResponse = {
  card: CatchUpCard;
  sample?: boolean;
};

export type AskPromptKey =
  | "deciding"
  | "tasks_for_me"
  | "explain"
  | "suggest_question";

export type AskRequest = {
  promptKey: AskPromptKey;
  term?: string;
  transcript?: string;
  userName?: string;
  signals?: string[];
};

export type AskResponse = {
  answer: string;
  snippet?: string;
  sample?: boolean;
};
