"use client";

import { useState } from "react";

import {
  Flag,
  Lightbulb,
  MessageCircleQuestion,
  RefreshCw,
  Scale,
} from "lucide-react";

import { announce } from "@/components/StatusAnnouncer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ASK_WINDOW_SEC } from "@/lib/ask";
import { formatTimestamp } from "@/lib/captions";
import { getSignalLabel } from "@/lib/meeting-signals";
import { useCaptionStore } from "@/stores/captionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { AskPromptKey, AskResponse } from "@/types";

type AskTheMeetingProps = {
  onOpenCatchUp: () => void;
};

type AskParams = {
  promptKey: AskPromptKey;
  term?: string;
};

export function AskTheMeeting({ onOpenCatchUp }: AskTheMeetingProps) {
  const mode = useCaptionStore((state) => state.mode);
  const getTranscriptTextForWindow = useCaptionStore(
    (state) => state.getTranscriptTextForWindow,
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAsk, setLastAsk] = useState<AskParams | null>(null);
  const [explainOpen, setExplainOpen] = useState(false);
  const [term, setTerm] = useState("");

  const sessionActive = mode !== "idle";

  const ask = async (params: AskParams) => {
    if (loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setLastAsk(params);
    announce("Thinking about that");

    const { playbackTimeSec, meetingSignals } = useCaptionStore.getState();
    const transcript = getTranscriptTextForWindow(
      Math.max(0, playbackTimeSec - ASK_WINDOW_SEC),
      playbackTimeSec,
    );
    const userName = useSettingsStore.getState().userName;
    const signals = meetingSignals
      .slice(0, 4)
      .map(
        (signal) =>
          `${getSignalLabel(signal)} (${formatTimestamp(signal.timestamp)}): ${signal.text}`,
      );

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptKey: params.promptKey,
          term: params.term || undefined,
          transcript,
          userName: userName || undefined,
          signals: signals.length > 0 ? signals : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get an answer");
      }

      setResult((await response.json()) as AskResponse);
      announce("Answer ready");
    } catch {
      setError("Couldn't get an answer.");
      announce("Couldn't get an answer");
    } finally {
      setLoading(false);
    }
  };

  const submitExplain = () => {
    void ask({ promptKey: "explain", term: term.trim() || undefined });
  };

  return (
    <Card className="rounded-2xl border border-l-4 border-l-section-ask bg-section-ask-tint ring-0">
      <CardHeader className="pb-2">
        <CardTitle
          asChild
          className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-section-ask"
        >
          <h2>
            <MessageCircleQuestion className="size-4" aria-hidden />
            Ask the meeting
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {sessionActive
            ? "Short answers from the last few minutes of the meeting."
            : "Start listening, then pick a prompt."}
        </p>

        <div className="flex flex-col gap-1.5">
          <Button
            variant="ghost"
            className="justify-start rounded-xl"
            disabled={!sessionActive}
            onClick={onOpenCatchUp}
          >
            <Flag aria-hidden />
            What did I miss?
          </Button>
          <Button
            variant="ghost"
            className="justify-start rounded-xl"
            disabled={!sessionActive || loading}
            onClick={() => void ask({ promptKey: "deciding" })}
          >
            <Scale aria-hidden />
            What are we deciding?
          </Button>
          <Button
            variant="ghost"
            className="justify-start rounded-xl"
            disabled={!sessionActive || loading}
            aria-expanded={explainOpen}
            onClick={() => setExplainOpen((open) => !open)}
          >
            <Lightbulb aria-hidden />
            Explain this simply
          </Button>
          {explainOpen && (
            <div className="flex gap-2 pl-2">
              <Input
                value={term}
                placeholder="Term or phrase — empty for the latest confusing one"
                aria-label="Term or phrase to explain"
                disabled={!sessionActive || loading}
                onChange={(event) => setTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitExplain();
                }}
              />
              <Button
                variant="secondary"
                disabled={!sessionActive || loading}
                onClick={submitExplain}
              >
                Explain
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            className="justify-start rounded-xl"
            disabled={!sessionActive || loading}
            onClick={() => void ask({ promptKey: "suggest_question" })}
          >
            <MessageCircleQuestion aria-hidden />
            What question should I ask?
          </Button>
        </div>

        {loading && (
          <div className="space-y-2 rounded-xl bg-background/60 p-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-background/60 p-3">
            <p className="text-sm">{error}</p>
            {lastAsk && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void ask(lastAsk)}
              >
                <RefreshCw aria-hidden />
                Try again
              </Button>
            )}
          </div>
        )}

        {result && !loading && (
          <div className="space-y-2 rounded-xl bg-background/60 p-3 text-sm">
            <p className="leading-relaxed">{result.answer}</p>
            {result.snippet && (
              <blockquote className="border-l-2 border-border pl-2 italic text-muted-foreground">
                {result.snippet}
              </blockquote>
            )}
            {result.sample && (
              <Badge variant="outline">
                Sample output — add OPENAI_API_KEY for real answers
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
