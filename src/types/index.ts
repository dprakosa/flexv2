export type ReadingLevel = "original" | "grade8" | "grade6";

export type ContrastPreset = "default" | "high" | "dark-calm" | "dyslexia";

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
  readingLevel: ReadingLevel;
  fontSize: number;
  captionDelaySec: number;
  contrastPreset: ContrastPreset;
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

export type MissedSegmentRequest = {
  fromTimestamp: number;
  toTimestamp: number;
  transcript?: string;
};

export type MissedSegmentResponse = {
  recap: string;
  actionItems: ActionItem[];
};
