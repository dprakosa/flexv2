import { NextResponse } from "next/server";
import OpenAI from "openai";

import { formatTimestamp } from "@/lib/captions";
import {
  CATCH_UP_CARD_SCHEMA,
  buildEmptyCatchUpCard,
  buildSampleCatchUpCard,
  normalizeCatchUpCard,
} from "@/lib/catchup";
import {
  buildCatchUpInput,
  buildCatchUpInstructions,
  isOpenAiConfigured,
} from "@/lib/llm";
import type { MissedSegmentRequest, MissedSegmentResponse } from "@/types";

const DEFAULT_MODEL = "gpt-5-mini";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  client ??= new OpenAI({ timeout: 20_000, maxRetries: 1 });
  return client;
}

export async function POST(request: Request) {
  const body = (await request.json()) as MissedSegmentRequest;

  if (
    typeof body.fromTimestamp !== "number" ||
    typeof body.toTimestamp !== "number" ||
    !Number.isFinite(body.fromTimestamp) ||
    !Number.isFinite(body.toTimestamp)
  ) {
    return NextResponse.json(
      { error: "fromTimestamp and toTimestamp are required" },
      { status: 400 },
    );
  }

  const from = Math.max(0, body.fromTimestamp);
  const to = Math.max(from, body.toTimestamp);
  const transcript =
    typeof body.transcript === "string" ? body.transcript.trim() : "";
  const userName =
    typeof body.userName === "string" ? body.userName.trim() : "";

  if (!transcript) {
    const response: MissedSegmentResponse = {
      card: buildEmptyCatchUpCard(from, to),
      sample: true,
    };
    return NextResponse.json(response);
  }

  if (!isOpenAiConfigured()) {
    const response: MissedSegmentResponse = {
      card: buildSampleCatchUpCard(transcript, from, to, userName),
      sample: true,
    };
    return NextResponse.json(response);
  }

  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

  try {
    const result = await getClient().responses.create({
      model,
      instructions: buildCatchUpInstructions(userName),
      input: buildCatchUpInput(
        transcript,
        formatTimestamp(from),
        formatTimestamp(to),
      ),
      ...(model.startsWith("gpt-5")
        ? { reasoning: { effort: "minimal" as const } }
        : {}),
      text: {
        format: {
          type: "json_schema",
          name: "catch_up_card",
          strict: true,
          schema: CATCH_UP_CARD_SCHEMA as unknown as Record<string, unknown>,
        },
      },
      max_output_tokens: 700,
    });

    const card = normalizeCatchUpCard(JSON.parse(result.output_text), from, to);
    const response: MissedSegmentResponse = { card };
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      return NextResponse.json(
        { error: "The recap took too long to generate" },
        { status: 504 },
      );
    }

    console.error("[missed] catch-up generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate recap" },
      { status: 502 },
    );
  }
}
