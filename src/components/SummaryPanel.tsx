"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCaptionStore } from "@/stores/captionStore";

export function SummaryPanel() {
  const summary = useCaptionStore((state) => state.summary);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle asChild className="text-sm font-medium uppercase tracking-wide">
          <h2>Summary</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed">
          {summary?.text ??
            "Once you start listening, a plain-language summary of the meeting will appear here."}
        </p>
      </CardContent>
    </Card>
  );
}
