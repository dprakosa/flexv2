"use client";

import type { RefObject } from "react";

import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ASK_QUESTION_MAX_LENGTH } from "@/lib/ask";

type ChatComposerProps = {
  value: string;
  disabled: boolean;
  busy: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

// The input stays enabled while an answer is pending (only sending locks)
// so focus survives the round trip and the next question can be typed.
export function ChatComposer({
  value,
  disabled,
  busy,
  inputRef,
  onChange,
  onSubmit,
}: ChatComposerProps) {
  return (
    <form
      className="flex shrink-0 gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Input
        ref={inputRef}
        value={value}
        maxLength={ASK_QUESTION_MAX_LENGTH}
        placeholder="Ask about the meeting…"
        aria-label="Ask a question about the meeting"
        disabled={disabled}
        className="bg-background"
        onChange={(event) => onChange(event.target.value)}
      />
      <Button
        type="submit"
        size="icon"
        aria-label="Send question"
        disabled={disabled || busy || !value.trim()}
      >
        <Send aria-hidden />
      </Button>
    </form>
  );
}
