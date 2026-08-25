"use client";

import { useQuery } from "@tanstack/react-query";

import { getHermesClient } from "@/lib/hermes";
import type { HealthStatus } from "@/lib/hermes/types";
import { cn } from "@/lib/utils";

const LABELS: Record<HealthStatus, string> = {
  SERVING: "Serving",
  NOT_SERVING: "Not serving",
  UNKNOWN: "Unknown",
};

const DOT: Record<HealthStatus, string> = {
  SERVING: "bg-status-serving",
  NOT_SERVING: "bg-status-not-serving",
  UNKNOWN: "bg-status-unknown",
};

/** Live HermesMQ health indicator in the header — polled, text-labelled, not color-only. */
export function HealthPill() {
  const { data, isLoading } = useQuery({
    queryKey: ["hermes", "health"],
    queryFn: () => getHermesClient().checkHealth(),
    refetchInterval: 15_000,
  });

  const status: HealthStatus = data ?? "UNKNOWN";

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
      title="HermesMQ health"
    >
      <span
        className={cn(
          "size-2 rounded-full",
          isLoading ? "bg-status-unknown animate-pulse" : DOT[status]
        )}
      />
      {isLoading ? "Checking…" : LABELS[status]}
    </span>
  );
}
