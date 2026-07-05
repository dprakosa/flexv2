import type { CaptionChunk } from "@/types";

export type DemoTranscript = {
  title: string;
  durationSec: number;
  chunks: CaptionChunk[];
  summary: string;
};

import demoTranscript from "./demo-transcript.json";

export const DEMO_TRANSCRIPT = demoTranscript as DemoTranscript;

export function getDemoCaptionsUpTo(timeSec: number): CaptionChunk[] {
  return DEMO_TRANSCRIPT.chunks.filter((chunk) => chunk.timestamp <= timeSec);
}

export async function runDemoPlayback(
  onTick: (timeSec: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  const tickMs = 500;
  let elapsed = 0;

  while (elapsed <= DEMO_TRANSCRIPT.durationSec) {
    if (signal?.aborted) return;

    onTick(elapsed);
    await new Promise((resolve) => setTimeout(resolve, tickMs));
    elapsed += tickMs / 1000;
  }
}
