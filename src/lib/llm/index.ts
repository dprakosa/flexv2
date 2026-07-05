import type { ReadingLevel } from "@/types";

export type LlmProvider = "openai" | "gemini";

export function getLlmProvider(): LlmProvider {
  return process.env.GEMINI_API_KEY ? "gemini" : "openai";
}

export function isLlmConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);
}

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function buildSimplifyPrompt(text: string, readingLevel: ReadingLevel) {
  const target =
    readingLevel === "grade6"
      ? "grade 6 reading level"
      : "grade 8 reading level";

  return `Rewrite the following meeting caption in plain ${target}. Keep names and decisions intact. Return only the rewritten text.\n\n${text}`;
}

export function buildSummaryPrompt(transcript: string) {
  return `Summarize this meeting transcript in plain language (grade 6 reading level). Use 2-3 short sentences.\n\n${transcript}`;
}

export function buildActionItemsPrompt(transcript: string) {
  return `Extract action items from this meeting transcript. Return JSON array of { "assignee": string | null, "task": string }.\n\n${transcript}`;
}

export function buildCatchUpInstructions(userName?: string) {
  const nameLine = userName?.trim()
    ? `The participant's name is "${userName.trim()}".`
    : "The participant has not given their name — treat all mentions as uncertain and never use \"clearly_mentioned\".";

  return [
    "You help a meeting participant recover after losing the thread of a live meeting.",
    "You receive a transcript window; each line starts with a second offset like [95s].",
    nameLine,
    "",
    "Rules:",
    "- Be brief and plain-language (about grade 8 reading level). At most 4 items per list, one short sentence each.",
    "- Summarize only this window — what changed, decisions made, questions left open. Never write a generic meeting summary.",
    '- Use cautious wording for anything not explicit: "Possible task:", "It sounds like…". Never invent names, dates, owners, or decisions.',
    "- possibleTasksForUser: only tasks that could plausibly be for the participant; include a short quoted snippet as evidence.",
    '- userMentions: quote each place the participant is named or directly addressed. mentionStatus is "clearly_mentioned" only with direct evidence; "possibly_mentioned" for ambiguous references; otherwise "not_mentioned".',
    "- suggestedQuestion: one short, natural question the participant could ask aloud to rejoin, or null.",
    "- Use empty arrays or null rather than padding with filler.",
  ].join("\n");
}

export function buildCatchUpInput(
  transcript: string,
  fromLabel: string,
  toLabel: string,
) {
  return `Transcript from ${fromLabel} to ${toLabel} of the meeting:\n\n${transcript}`;
}
