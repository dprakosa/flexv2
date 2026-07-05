"use client";

import {
  MessageCircleQuestion,
  Scale,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AskParams } from "@/types";

type QuickAsksProps = {
  variant: "starters" | "row";
  sessionActive: boolean;
  pending: boolean;
  onOpenCatchUp: () => void;
  onAsk: (params: AskParams, label: string) => void;
};

// The quick asks exist for the moment you've lost the thread and can't
// formulate the question yourself — each one saves real typing.
// "starters" fills the empty chat; "row" is the slim pill row above the
// composer once a conversation exists.
export function QuickAsks({
  variant,
  sessionActive,
  pending,
  onOpenCatchUp,
  onAsk,
}: QuickAsksProps) {
  const askDisabled = !sessionActive || pending;

  const buttonProps =
    variant === "starters"
      ? { size: "lg" as const, className: "w-full justify-start" }
      : { size: "sm" as const, className: "rounded-full" };

  return (
    <div
      role="group"
      aria-label="Suggested questions"
      className={
        variant === "starters"
          ? "flex w-full max-w-xs flex-col gap-2"
          : "flex shrink-0 flex-wrap gap-1.5"
      }
    >
      <Button
        variant="outline"
        {...buttonProps}
        disabled={!sessionActive}
        onClick={onOpenCatchUp}
      >
        <Sparkles aria-hidden />
        Catch me up
      </Button>
      <Button
        variant="outline"
        {...buttonProps}
        disabled={askDisabled}
        onClick={() => onAsk({ promptKey: "deciding" }, "What are we deciding?")}
      >
        <Scale aria-hidden />
        What are we deciding?
      </Button>
      <Button
        variant="outline"
        {...buttonProps}
        disabled={askDisabled}
        onClick={() =>
          onAsk({ promptKey: "suggest_question" }, "What should I ask?")
        }
      >
        <MessageCircleQuestion aria-hidden />
        What should I ask?
      </Button>
    </div>
  );
}
