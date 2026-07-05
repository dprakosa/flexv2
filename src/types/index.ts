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

export type UserAccessibilitySettings = {
  userName: string;
  themePreset: ThemePreset;
  textScale: TextScale;
  readingLevel: ReadingLevel;
  captionDelaySec: number;
  reduceCognitiveLoad: boolean;
};

export type ActionItem = {
  id: string;
  assignee?: string;
  task: string;
  timestamp: number;
  sourceCaptionId: string;
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
