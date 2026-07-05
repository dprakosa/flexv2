import { NextResponse } from "next/server";
import OpenAI from "openai";

import {
  ASK_ANSWER_SCHEMA,
  ASK_PROMPT_KEYS,
  ASK_QUESTION_MAX_LENGTH,
  buildSampleAskAnswer,
  normalizeAskResponse,
} from "@/lib/ask";
import {
  buildAskInput,
  buildAskInstructions,
  isOpenAiConfigured,
} from "@/lib/llm";
import type { AskPromptKey, AskRequest, AskResponse } from "@/types";

const DEFAULT_MODEL = "gpt-5-mini";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  client ??= new OpenAI({ timeout: 20_000, maxRetries: 1 });
  return client;
}

export async function POST(request: Request) {
  const body = (await request.json()) as AskRequest;

  if (!ASK_PROMPT_KEYS.includes(body.promptKey as AskPromptKey)) {
    return NextResponse.json(
      { error: "promptKey must be one of the supported prompts" },
      { status: 400 },
    );
  }

  const transcript =
    typeof body.transcript === "string" ? body.transcript.trim() : "";
  const term = typeof body.term === "string" ? body.term.trim() : "";
  const question =
    typeof body.question === "string" ? body.question.trim() : "";
  const userName =
    typeof body.userName === "string" ? body.userName.trim() : "";

  if (
    body.promptKey === "custom" &&
    (!question || question.length > ASK_QUESTION_MAX_LENGTH)
  ) {
    return NextResponse.json(
      {
        error: `question is required for custom asks (max ${ASK_QUESTION_MAX_LENGTH} chars)`,
      },
      { status: 400 },
    );
  }
  const signals = Array.isArray(body.signals)
    ? body.signals
        .filter((signal): signal is string => typeof signal === "string")
        .slice(0, 4)
    : undefined;

  if (!transcript) {
    const response: AskResponse = {
      answer: "I don't have enough of the meeting yet — give it a moment.",
      sample: true,
    };
    return NextResponse.json(response);
  }

  if (!isOpenAiConfigured()) {
    const response: AskResponse = {
      ...buildSampleAskAnswer(
        body.promptKey,
        transcript,
        term,
        userName,
        question,
      ),
      sample: true,
    };
    return NextResponse.json(response);
  }

  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

  try {
    const result = await getClient().responses.create({
      model,
      instructions: buildAskInstructions(body.promptKey, userName, term, question),
      input: buildAskInput(transcript, signals),
      ...(model.startsWith("gpt-5")
        ? { reasoning: { effort: "minimal" as const } }
        : {}),
      text: {
        format: {
          type: "json_schema",
          name: "ask_answer",
          strict: true,
          schema: ASK_ANSWER_SCHEMA as unknown as Record<string, unknown>,
        },
      },
      max_output_tokens: 250,
    });

    const response: AskResponse = normalizeAskResponse(
      JSON.parse(result.output_text),
    );
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      return NextResponse.json(
        { error: "The answer took too long to generate" },
        { status: 504 },
      );
    }

    console.error("[ask] answer generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate an answer" },
      { status: 502 },
    );
  }
}
