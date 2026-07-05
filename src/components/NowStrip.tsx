"use client";

import { useCaptionStore } from "@/stores/captionStore";

function StripRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="pt-0.5 text-xs font-semibold uppercase tracking-wider text-section-thread">
        {label}
      </span>
      <p className="line-clamp-2 text-sm leading-snug">{value}</p>
    </>
  );
}

// Compact highlight docked at the bottom of the captions pane. Rows render
// only when the heuristic found something; the whole strip hides otherwise.
export function NowStrip() {
  const currentThread = useCaptionStore((state) => state.currentThread);

  const { currentTopic, lastDecision, openQuestion } = currentThread;
  if (!currentTopic && !lastDecision && !openQuestion) return null;

  return (
    <section
      aria-label="Current thread"
      className="mt-3 grid shrink-0 grid-cols-[4.5rem_1fr] gap-x-3 gap-y-2 rounded-xl border-l-4 border-l-section-thread bg-section-thread-tint px-4 py-3"
    >
      <h3 className="sr-only">Current thread</h3>
      {currentTopic && <StripRow label="Now" value={currentTopic} />}
      {lastDecision && <StripRow label="Decided" value={lastDecision} />}
      {openQuestion && <StripRow label="Open" value={openQuestion} />}
    </section>
  );
}
