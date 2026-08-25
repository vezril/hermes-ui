"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  BarChart3,
  Factory,
  Radio,
  RefreshCw,
  Send,
  Skull,
  Users,
  Waypoints,
} from "lucide-react";

import { useMetrics } from "@/lib/hooks/use-metrics";
import { useSubscriptions } from "@/lib/hooks/use-subscriptions";
import { useTopics } from "@/lib/hooks/use-topics";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function Tile({
  icon: Icon,
  label,
  value,
  emphasize,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <div
        className={cn(
          "font-mono text-2xl tabular-nums",
          emphasize && "text-destructive"
        )}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Statistics view — the broker at a glance. Aggregates the topic and
 * subscription listings with HermesMQ's Prometheus exposition (the only source
 * of active-producer / active-consumer counts and the deduplication tally) into
 * headline tiles plus per-topic and per-subscription breakdowns. Counts are
 * per-node activity windows, so treat producer/consumer numbers as "recently
 * active", not a registry.
 */
export function Statistics() {
  const topics = useTopics();
  const subs = useSubscriptions();
  const metrics = useMetrics();

  const isLoading = topics.isLoading || subs.isLoading || metrics.isLoading;
  const isError = topics.isError || subs.isError || metrics.isError;

  const m = metrics.data;
  const topicRows = React.useMemo(() => {
    const list = topics.data ?? [];
    return [...list]
      .map((t) => ({
        topicId: t.topicId,
        published: m?.publishedByTopic[t.topicId] ?? t.publishedTotal,
        producers: m?.producersByTopic[t.topicId] ?? 0,
        dedup: m?.dedupByTopic[t.topicId] ?? 0,
        subscribers: (subs.data ?? []).filter((s) => s.topicId === t.topicId)
          .length,
      }))
      .sort((a, b) => b.published - a.published);
  }, [topics.data, subs.data, m]);

  const subRows = React.useMemo(() => {
    return [...(subs.data ?? [])]
      .map((s) => ({
        ...s,
        consumers: m?.consumersBySub[s.subscriptionId] ?? 0,
      }))
      .sort((a, b) => b.backlog - a.backlog);
  }, [subs.data, m]);

  const totals = React.useMemo(() => {
    const list = subs.data ?? [];
    return {
      topics: topics.data?.length ?? 0,
      subscriptions: list.length,
      published: sum(topicRows.map((t) => t.published)),
      producers: m ? sum(Object.values(m.producersByTopic)) : 0,
      consumers: m ? sum(Object.values(m.consumersBySub)) : 0,
      backlog: sum(list.map((s) => s.backlog)),
      deadLettered: sum(list.map((s) => s.deadLetteredTotal)),
      deduplicated: m ? sum(Object.values(m.dedupByTopic)) : 0,
    };
  }, [topics.data, subs.data, topicRows, m]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Statistics</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The broker at a glance — live, per node.
            </p>
          </div>
        </div>
        {metrics.isFetching && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="size-3.5 animate-spin" />
            refreshing
          </span>
        )}
      </header>

      {isError ? (
        <div className="flex flex-col items-center gap-2 py-24 text-center text-muted-foreground">
          <AlertCircle className="size-6 text-destructive" />
          <p>Couldn&apos;t load statistics.</p>
        </div>
      ) : isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile icon={Send} label="Topics" value={String(totals.topics)} />
            <Tile
              icon={Waypoints}
              label="Subscriptions"
              value={String(totals.subscriptions)}
            />
            <Tile
              icon={Radio}
              label="Published"
              value={formatCount(totals.published)}
            />
            <Tile
              icon={Waypoints}
              label="Backlog"
              value={formatCount(totals.backlog)}
            />
            <Tile
              icon={Factory}
              label="Producers"
              value={String(totals.producers)}
            />
            <Tile
              icon={Users}
              label="Consumers"
              value={String(totals.consumers)}
            />
            <Tile
              icon={RefreshCw}
              label="Deduplicated"
              value={formatCount(totals.deduplicated)}
            />
            <Tile
              icon={Skull}
              label="Dead-lettered"
              value={formatCount(totals.deadLettered)}
              emphasize={totals.deadLettered > 0}
            />
          </div>

          {/* Per-topic */}
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Topics
            </h2>
            {topicRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                No topics yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-card text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Topic</th>
                      <th className="px-4 py-2 text-right font-medium">Published</th>
                      <th className="px-4 py-2 text-right font-medium">Producers</th>
                      <th className="px-4 py-2 text-right font-medium">Subscribers</th>
                      <th className="px-4 py-2 text-right font-medium">Dedup</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {topicRows.map((t) => (
                      <tr key={t.topicId} className="bg-card/50">
                        <td className="px-4 py-2">
                          <Link
                            href={`/topics/${encodeURIComponent(t.topicId)}`}
                            className="font-mono hover:text-primary hover:underline"
                          >
                            {t.topicId}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums">
                          {formatCount(t.published)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums">
                          {t.producers}
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums">
                          {t.subscribers}
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums text-muted-foreground">
                          {formatCount(t.dedup)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Per-subscription */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Subscriptions
            </h2>
            {subRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                No subscriptions yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-card text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Subscription</th>
                      <th className="px-4 py-2 text-left font-medium">Topic</th>
                      <th className="px-4 py-2 text-right font-medium">Backlog</th>
                      <th className="px-4 py-2 text-right font-medium">Consumers</th>
                      <th className="px-4 py-2 text-right font-medium">Dead-lettered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {subRows.map((s) => (
                      <tr key={s.subscriptionId} className="bg-card/50">
                        <td className="px-4 py-2 font-mono">{s.subscriptionId}</td>
                        <td className="px-4 py-2">
                          <Link
                            href={`/topics/${encodeURIComponent(s.topicId)}`}
                            className="font-mono text-muted-foreground hover:text-primary hover:underline"
                          >
                            {s.topicId}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums">
                          {formatCount(s.backlog)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums">
                          {s.consumers}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {s.deadLetteredTotal > 0 ? (
                            <Badge variant="muted" className="text-destructive">
                              {formatCount(s.deadLetteredTotal)}
                            </Badge>
                          ) : (
                            <span className="font-mono tabular-nums text-muted-foreground">
                              0
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
