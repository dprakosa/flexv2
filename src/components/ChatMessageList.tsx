"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTimestamp } from "@/lib/captions";
import { getSignalLabel } from "@/lib/meeting-signals";
import { cn } from "@/lib/utils";
import type { AskParams, ChatMessage } from "@/types";

type ChatMessageListProps = {
  messages: ChatMessage[];
  pending: boolean;
  sessionActive: boolean;
  onRetry: (ask: AskParams) => void;
  emptyStateExtra?: ReactNode;
};

// Snippets sometimes arrive already wrapped in quote marks; strip them so
// the typographic quotes added here don't double up.
function stripQuotes(text: string): string {
  return text.replace(/^["“”']+|["“”']+$/g, "");
}

// Flat message rendering: the user's ink bubble is the only filled element;
// answers and auto notes are plain text separated by whitespace, no boxes.
function ChatMessageItem({
  message,
  onRetry,
}: {
  message: ChatMessage;
  onRetry: (ask: AskParams) => void;
}) {
  switch (message.kind) {
    case "user":
      return (
        <div className="flex justify-end">
          <p className="max-w-[85%] rounded-xl rounded-br-sm bg-primary px-3 py-2 leading-(--app-leading) text-primary-foreground">
            {message.text}
          </p>
        </div>
      );
    case "answer":
      return (
        <div className="max-w-[95%] space-y-1.5">
          <p className="leading-(--app-leading)">{message.answer}</p>
          {message.snippet && (
            <p className="pl-3 leading-(--app-leading) text-muted-foreground">
              &ldquo;{stripQuotes(message.snippet)}&rdquo;
            </p>
          )}
          {message.sample && (
            <Badge variant="outline">
              Sample output — add OPENAI_API_KEY for real answers
            </Badge>
          )}
        </div>
      );
    case "error":
      return (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-muted-foreground">{message.text}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRetry(message.ask)}
          >
            <RefreshCw aria-hidden />
            Try again
          </Button>
        </div>
      );
    case "signal": {
      const isMention = message.signal.type === "mention";
      return (
        <div className="max-w-[95%] space-y-1">
          <p
            className={cn(
              "flex flex-wrap items-center gap-x-1.5 text-xs font-medium uppercase tracking-wide",
              isMention ? "text-section-mention" : "text-section-tasks",
            )}
          >
            <span aria-hidden>●</span>
            {getSignalLabel(message.signal)}
            <span className="font-normal normal-case tracking-normal text-muted-foreground">
              · {formatTimestamp(message.signal.timestamp)}
            </span>
          </p>
          {message.sourceText ? (
            <p className="pl-3 leading-(--app-leading) text-muted-foreground">
              &ldquo;{stripQuotes(message.sourceText)}&rdquo;
            </p>
          ) : (
            <p className="leading-(--app-leading)">{message.signal.text}</p>
          )}
        </div>
      );
    }
  }
}

export function ChatMessageList({
  messages,
  pending,
  sessionActive,
  onRetry,
  emptyStateExtra,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);

  const lastKind = messages.at(-1)?.kind;

  // Follow new messages only while the user is at (or near) the bottom, or
  // when they just sent a question themselves.
  useEffect(() => {
    if (nearBottomRef.current || lastKind === "user") {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, pending, lastKind]);

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-auto text-sm"
      onScroll={() => {
        const el = scrollRef.current;
        if (!el) return;
        nearBottomRef.current =
          el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
    >
      {messages.length === 0 && !pending && (
        <div className="flex h-full flex-col items-center justify-center gap-5 px-2 py-6 text-center">
          <p className="text-muted-foreground">
            {sessionActive
              ? "Answers come only from what's been said in this meeting."
              : "Start listening, then ask about the meeting."}
          </p>
          {emptyStateExtra}
        </div>
      )}

      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Ask the meeting conversation"
        className="space-y-5"
      >
        {messages.map((message) => (
          <ChatMessageItem
            key={message.id}
            message={message}
            onRetry={onRetry}
          />
        ))}
      </div>

      {pending && (
        <div className="max-w-[92%] space-y-2 pt-5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}

      <div ref={endRef} aria-hidden />
    </div>
  );
}
