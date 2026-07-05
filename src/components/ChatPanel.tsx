"use client";

import { useRef, useState } from "react";

import { MessageCircleQuestion } from "lucide-react";

import { ChatComposer } from "@/components/ChatComposer";
import { ChatMessageList } from "@/components/ChatMessageList";
import { QuickAsks } from "@/components/QuickAsks";
import { announce } from "@/components/StatusAnnouncer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ASK_WINDOW_SEC } from "@/lib/ask";
import { formatTimestamp } from "@/lib/captions";
import { getSignalLabel } from "@/lib/meeting-signals";
import { useCaptionStore } from "@/stores/captionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { AskParams, AskResponse } from "@/types";

type ChatPanelProps = {
  onOpenCatchUp: () => void;
};

export function ChatPanel({ onOpenCatchUp }: ChatPanelProps) {
  const mode = useCaptionStore((state) => state.mode);
  const chatMessages = useCaptionStore((state) => state.chatMessages);
  const appendChatMessage = useCaptionStore((state) => state.appendChatMessage);
  const getTranscriptTextForWindow = useCaptionStore(
    (state) => state.getTranscriptTextForWindow,
  );
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const sessionActive = mode !== "idle";

  // echoUserText posts the question bubble; retries omit it so the original
  // bubble isn't duplicated.
  const ask = async (params: AskParams, echoUserText?: string) => {
    if (pending) return;

    if (echoUserText) {
      appendChatMessage({
        id: crypto.randomUUID(),
        kind: "user",
        text: echoUserText,
        ask: params,
        atSec: useCaptionStore.getState().playbackTimeSec,
      });
    }

    setPending(true);
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
          question: params.question || undefined,
          transcript,
          userName: userName || undefined,
          signals: signals.length > 0 ? signals : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get an answer");
      }

      const result = (await response.json()) as AskResponse;
      appendChatMessage({
        id: crypto.randomUUID(),
        kind: "answer",
        answer: result.answer,
        snippet: result.snippet,
        sample: result.sample,
        ask: params,
        atSec: useCaptionStore.getState().playbackTimeSec,
      });
    } catch {
      appendChatMessage({
        id: crypto.randomUUID(),
        kind: "error",
        text: "Couldn't get an answer.",
        ask: params,
        atSec: useCaptionStore.getState().playbackTimeSec,
      });
      announce("Couldn't get an answer");
    } finally {
      setPending(false);
    }
  };

  const submitDraft = () => {
    const question = draft.trim();
    if (!question || pending || !sessionActive) return;

    setDraft("");
    inputRef.current?.focus();
    void ask({ promptKey: "custom", question }, question);
  };

  // Starter buttons fill the empty chat; once anything lands (even an auto
  // note) they collapse to the slim pill row above the composer.
  const isEmpty = chatMessages.length === 0;

  return (
    <Card className="flex min-h-[55dvh] flex-1 flex-col rounded-2xl border bg-card ring-0 lg:min-h-0">
      <CardHeader className="shrink-0">
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
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        <ChatMessageList
          messages={chatMessages}
          pending={pending}
          sessionActive={sessionActive}
          onRetry={(params) => void ask(params)}
          emptyStateExtra={
            <QuickAsks
              variant="starters"
              sessionActive={sessionActive}
              pending={pending}
              onOpenCatchUp={onOpenCatchUp}
              onAsk={(params, label) => void ask(params, label)}
            />
          }
        />
        {!isEmpty && (
          <QuickAsks
            variant="row"
            sessionActive={sessionActive}
            pending={pending}
            onOpenCatchUp={onOpenCatchUp}
            onAsk={(params, label) => void ask(params, label)}
          />
        )}
        <ChatComposer
          value={draft}
          disabled={!sessionActive}
          busy={pending}
          inputRef={inputRef}
          onChange={setDraft}
          onSubmit={submitDraft}
        />
      </CardContent>
    </Card>
  );
}
