"use client";

import { useQuery } from "@tanstack/react-query";

import { getHermesClient } from "@/lib/hermes";

export const metricsQueryKey = ["hermes", "metrics"] as const;

/**
 * HermesMQ's parsed Prometheus exposition — the source of active-producer /
 * active-consumer counts and the aggregate feed behind the statistics view.
 * Polled so the dashboards stay live; counts are per-node activity windows.
 */
export function useMetrics() {
  return useQuery({
    queryKey: metricsQueryKey,
    queryFn: () => getHermesClient().getMetrics(),
    refetchInterval: 15_000,
  });
}
