import type { TranscriptChunk } from "@/types";

export type StreamingSttConfig = {
  apiKey: string;
  model?: string;
  diarize?: boolean;
};

export type SttTranscriptEvent = TranscriptChunk & {
  speaker?: string;
};

export function getDeepgramApiKey(): string | undefined {
  return process.env.DEEPGRAM_API_KEY;
}

export function isSttConfigured(): boolean {
  return Boolean(getDeepgramApiKey());
}

// Phase 1: implement WebSocket proxy to Deepgram streaming API.
export async function createStreamingTranscriber(): Promise<null> {
  return null;
}
