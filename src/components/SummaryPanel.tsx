"use client";

import { AlignLeft } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCaptionStore } from "@/stores/captionStore";

export function SummaryPanel() {
  const summary = useCaptionStore((state) => state.summary);

  // Live summaries aren't generated yet (/api/summary is a stub), so the
  // card only renders when something actually set one (demo mode today).
  if (!summary) return null;

  return (
    <Card className="rounded-2xl border border-l-4 border-l-section-summary bg-section-summary-tint ring-0">
      <CardHeader className="pb-2">
        <CardTitle
          asChild
          className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-section-summary"
        >
          <h2>
            <AlignLeft className="size-4" aria-hidden />
            Summary
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-base leading-relaxed">{summary.text}</p>
      </CardContent>
    </Card>
  );
}
