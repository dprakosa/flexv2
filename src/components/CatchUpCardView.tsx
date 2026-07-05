"use client";

import { useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { formatTimestamp } from "@/lib/captions";
import type { CatchUpCard } from "@/types";

type CatchUpCardViewProps = {
  card: CatchUpCard;
  sample?: boolean;
};

function CardSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-1.5">
      <h3 className="font-medium">{title}</h3>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CatchUpCardView({ card, sample }: CatchUpCardViewProps) {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    regionRef.current?.focus();
  }, []);

  const isEmpty =
    !card.currentTopic &&
    card.whatChanged.length === 0 &&
    card.decisions.length === 0 &&
    card.possibleTasksForUser.length === 0 &&
    card.openQuestions.length === 0 &&
    card.userMentions.length === 0;

  return (
    <div
      ref={regionRef}
      role="region"
      aria-label="Catch-up recap"
      tabIndex={-1}
      className="space-y-4 rounded-xl bg-muted p-4 text-sm outline-none"
    >
      <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
        <span>
          Covers {formatTimestamp(card.fromTimestamp)} →{" "}
          {formatTimestamp(card.toTimestamp)}
        </span>
        {sample && (
          <Badge variant="outline">
            Sample output — add OPENAI_API_KEY for real recaps
          </Badge>
        )}
      </div>

      {isEmpty ? (
        <p>Nothing captured in that window yet — try again in a moment.</p>
      ) : (
        <>
          {card.currentTopic && (
            <section className="space-y-1.5">
              <h3 className="font-medium">Current topic</h3>
              <p>{card.currentTopic}</p>
            </section>
          )}

          <CardSection title="What changed" items={card.whatChanged} />
          <CardSection title="Decisions" items={card.decisions} />
          <CardSection
            title="Possible tasks for you"
            items={card.possibleTasksForUser}
          />
          <CardSection title="Open questions" items={card.openQuestions} />

          <section className="space-y-1.5">
            <h3 className="font-medium">Were you mentioned?</h3>
            {card.userMentions.length > 0 ? (
              <ul className="space-y-1">
                {card.userMentions.map((mention) => (
                  <li key={mention} className="flex gap-2">
                    <span aria-hidden="true">•</span>
                    <span>{mention}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                {card.mentionStatus === "possibly_mentioned"
                  ? "You may have been mentioned, but it wasn't clear."
                  : "You were not clearly asked to do anything."}
              </p>
            )}
          </section>

          {card.suggestedQuestion && (
            <section className="space-y-1.5">
              <h3 className="font-medium">Question you could ask</h3>
              <blockquote className="border-l-2 border-border pl-3">
                &ldquo;{card.suggestedQuestion}&rdquo;
              </blockquote>
            </section>
          )}
        </>
      )}
    </div>
  );
}
