import type { AskPromptKey, ReadingLevel } from "@/types";

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

const ASK_TASKS: Record<AskPromptKey, string> = {
  deciding:
    "Task: state what is currently being decided or the most recent decision made in this window.",
  tasks_for_me:
    "Task: say whether anything in this window sounds like a task, deadline, or direct question for the participant. If nothing does, say so plainly.",
  explain: "", // built dynamically from the term
  suggest_question:
    "Task: suggest one short, natural question the participant could ask aloud right now to rejoin the conversation.",
  custom: "", // built dynamically from the free-text question
  line_context: "", // built dynamically from the tapped transcript line
};

export function buildAskInstructions(
  promptKey: AskPromptKey,
  userName?: string,
  term?: string,
  question?: string,
) {
  const nameLine = userName?.trim()
    ? `The participant's name is "${userName.trim()}".`
    : "The participant has not given their name — treat anything that might be for them as uncertain.";

  const task =
    promptKey === "explain"
      ? term?.trim()
        ? `Task: explain "${term.trim()}" simply, as it is used in this meeting.`
        : "Task: find the most likely confusing term, acronym, or phrase in this window and explain it simply."
      : promptKey === "custom"
        ? `Task: answer the participant's question: "${question?.trim() ?? ""}". If the transcript window does not contain the answer, say plainly that it has not come up in the last few minutes — never answer from outside knowledge.`
        : promptKey === "line_context"
          ? `Task: the participant tapped this line from the transcript because it confused them: "${question?.trim() ?? ""}". In 2-4 short sentences, explain (1) what it means in plain language, (2) how it connects to the surrounding discussion, and (3) the tone, if evident. End with one short follow-up question they could ask aloud, phrased as: You could ask: "…".`
          : ASK_TASKS[promptKey];

  return [
    "You help a meeting participant follow a live meeting. You receive a transcript window; each line starts with a second offset like [95s].",
    nameLine,
    "",
    task,
    "",
    "Rules:",
    "- Answer in 1-3 short plain-language sentences (about grade 8 reading level).",
    "- Use only this transcript window. If it doesn't answer the question, say so plainly.",
    '- Use cautious wording for anything not explicit: "It sounds like…", "Possible task:". Never invent names, owners, or dates.',
    "- There are no speaker labels — never attribute a statement to a person unless their name appears in the words.",
    "- snippet: one short verbatim quote from the transcript that supports your answer, or null.",
  ].join("\n");
}

export function buildAskInput(transcript: string, signals?: string[]) {
  const signalsBlock =
    signals && signals.length > 0
      ? `\n\nRecent meeting signals (heuristic, verify against the transcript):\n${signals
          .map((signal) => `- ${signal}`)
          .join("\n")}`
      : "";

  return `Transcript of the last few minutes of the meeting:\n\n${transcript}${signalsBlock}`;
}
