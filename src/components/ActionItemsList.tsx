"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTimestamp } from "@/lib/captions";
import { useCaptionStore } from "@/stores/captionStore";

export function ActionItemsList() {
  const actionItems = useCaptionStore((state) => state.actionItems);

  return (
    <Card className="min-h-0 flex-1">
      <CardHeader className="pb-2">
        <CardTitle asChild className="text-sm font-medium uppercase tracking-wide">
          <h2>Action items</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {actionItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Detected tasks will appear here.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {actionItems.map((item) => (
              <li key={item.id} className="flex gap-2">
                <span aria-hidden="true">•</span>
                <span>
                  {item.assignee ? (
                    <>
                      <strong>{item.assignee}</strong>
                      {" → "}
                    </>
                  ) : null}
                  {item.task}
                  <span className="ml-2 text-sm text-muted-foreground">
                    {formatTimestamp(item.timestamp)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
