import type { VisualContextResult } from "@/types";

// Minimum chars a topic needs before it's worth a search call at all.
export const MIN_TOPIC_CHARS_FOR_SEARCH = 16;

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
