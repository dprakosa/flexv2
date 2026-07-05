import { NextResponse } from "next/server";

import { isImageSearchConfigured } from "@/lib/llm";
import {
  MIN_TOPIC_CHARS_FOR_SEARCH,
  buildVisualContextResult,
} from "@/lib/visual-context";
import type { VisualContextRequest, VisualContextResponse } from "@/types";

type ImageCandidate = { imageUrl: string; sourceUrl: string };

async function searchTopImage(query: string): Promise<ImageCandidate | undefined> {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_images");
  url.searchParams.set("api_key", process.env.SERPAPI_API_KEY!);
  url.searchParams.set("q", query);

  // Dev-server cold start (first Turbopack compile + first outbound fetch)
  // can exceed 8s on its own before SerpAPI is even reached; give it real room.
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) return undefined;

  const data = (await response.json()) as {
    images_results?: { original?: string; link?: string }[];
  };

  const top = (data.images_results ?? []).find(
    (item): item is { original: string; link?: string } =>
      typeof item.original === "string",
  );

  return top ? { imageUrl: top.original, sourceUrl: top.link ?? top.original } : undefined;
}

export async function POST(request: Request) {
  const body = (await request.json()) as VisualContextRequest;
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";

  const empty: VisualContextResponse = { result: null, sample: true };

  if (topic.length < MIN_TOPIC_CHARS_FOR_SEARCH || !isImageSearchConfigured()) {
    return NextResponse.json(empty);
  }

  try {
    const candidate = await searchTopImage(topic);
    const result = buildVisualContextResult(topic, candidate);
    return NextResponse.json({ result } satisfies VisualContextResponse);
  } catch (error) {
    console.error("[visual-context] lookup failed:", error);
    return NextResponse.json(
      { error: "Failed to look up visual context" },
      { status: 502 },
    );
  }
}
