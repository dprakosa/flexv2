import { NextResponse } from "next/server";

import { rankCandidatesByClipSimilarity, type ClipCandidate } from "@/lib/clip";
import { isImageSearchConfigured } from "@/lib/llm";
import {
  CLIP_MIN_SIMILARITY,
  MIN_TOPIC_CHARS_FOR_SEARCH,
  SEARCH_CANDIDATE_COUNT,
  buildVisualContextResult,
} from "@/lib/visual-context";
import type { VisualContextRequest, VisualContextResponse } from "@/types";

async function searchImages(query: string): Promise<ClipCandidate[]> {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_images");
  url.searchParams.set("api_key", process.env.SERPAPI_API_KEY!);
  url.searchParams.set("q", query);

  // Dev-server cold start (first Turbopack compile + first outbound fetch)
  // can exceed 8s on its own before SerpAPI is even reached; give it real room.
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) return [];

  const data = (await response.json()) as {
    images_results?: { original?: string; link?: string }[];
  };

  return (data.images_results ?? [])
    .filter((item): item is { original: string; link?: string } =>
      typeof item.original === "string",
    )
    .slice(0, SEARCH_CANDIDATE_COUNT)
    .map((item) => ({ imageUrl: item.original, sourceUrl: item.link ?? item.original }));
}

export async function POST(request: Request) {
  const body = (await request.json()) as VisualContextRequest;
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";

  const empty: VisualContextResponse = { result: null, sample: true };

  if (topic.length < MIN_TOPIC_CHARS_FOR_SEARCH || !isImageSearchConfigured()) {
    return NextResponse.json(empty);
  }

  try {
    const candidates = await searchImages(topic);
    if (candidates.length === 0) {
      return NextResponse.json({ result: null } satisfies VisualContextResponse);
    }

    const ranked = await rankCandidatesByClipSimilarity(topic, candidates);
    const best = ranked[0];

    const result =
      best && best.score >= CLIP_MIN_SIMILARITY
        ? buildVisualContextResult(topic, best)
        : null;

    return NextResponse.json({ result } satisfies VisualContextResponse);
  } catch (error) {
    console.error("[visual-context] lookup failed:", error);
    return NextResponse.json(
      { error: "Failed to look up visual context" },
      { status: 502 },
    );
  }
}
