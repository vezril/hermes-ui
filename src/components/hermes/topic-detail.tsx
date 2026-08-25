"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Factory,
  Radio,
  Send,
  Tag,
  Trash2,
  Users,
  Waypoints,
} from "lucide-react";

import { useMetrics } from "@/lib/hooks/use-metrics";
import {
  useDeleteSubscription,
  useSubscriptions,
} from "@/lib/hooks/use-subscriptions";
import { useDeleteTopic, useTopic, useTopics } from "@/lib/hooks/use-topics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateSubscriptionDialog } from "./create-subscription-dialog";
import { DeleteSubscriptionDialog } from "./delete-subscription-dialog";
import { DeleteTopicDialog } from "./delete-topic-dialog";
import { EditLabelsDialog } from "./edit-labels-dialog";

/** Compact count: 1234 → 1.2k, 1200000 → 1.2M. */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/** Humanize an age in seconds: 0s, 45s, 12m, 3h, 2d. */
function formatAge(seconds: number): string {
  if (seconds <= 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86_400)}d`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <div className="font-mono text-2xl tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

/**
 * Topic-detail view — everything about one topic in one place: its labels and
 * published volume, who produces to it (active-producer count from the
 * `hermesmq_topic_producers` gauge — HermesMQ exposes no producer identities),
 * and who subscribes (the subscriptions bound to it, with queue health). Also
 * the place to edit labels, delete, or subscribe.
 */
export function TopicDetail({ topicId }: { topicId: string }) {
  const topic = useTopic(topicId, true);
  const topics = useTopics();
  const subs = useSubscriptions();
  const metrics = useMetrics();
  const del = useDeleteTopic();
  const delSub = useDeleteSubscription();
  const [editing, setEditing] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deleted, setDeleted] = React.useState(false);
  const [deleteSubTarget, setDeleteSubTarget] = React.useState<string | null>(
    null
  );

  const summary = topics.data?.find((t) => t.topicId === topicId);
  const publishedTotal =
    metrics.data?.publishedByTopic[topicId] ?? summary?.publishedTotal ?? 0;
  const producerCount = metrics.data?.producersByTopic[topicId] ?? 0;
  const dedupTotal = metrics.data?.dedupByTopic[topicId] ?? 0;
  const topicSubs = React.useMemo(
    () => (subs.data ?? []).filter((s) => s.topicId === topicId),
    [subs.data, topicId]
  );

  async function confirmDelete() {
    try {
      await del.mutateAsync(topicId);
      setDeleted(true);
      setDeleting(false);
    } catch {
      // Surfaced in the dialog.
    }
  }

  async function confirmDeleteSub() {
    if (!deleteSubTarget) return;
    try {
      // The subscriptions list is invalidated on success, so the row drops out
      // of this topic's subscribers on the next fetch.
      await delSub.mutateAsync(deleteSubTarget);
      setDeleteSubTarget(null);
    } catch {
      // Surfaced in the dialog.
    }
  }

  const notFound = topic.isError || deleted;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All topics
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Send className="size-6 shrink-0 text-primary" />
          <div className="min-w-0">
            <h1 className="truncate font-mono text-2xl font-semibold tracking-tight">
              {topicId}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Topic detail</p>
          </div>
        </div>
        {!notFound && (
          <div className="flex items-center gap-2">
            <CreateSubscriptionDialog
              defaultTopicId={topicId}
              triggerLabel="Subscribe"
            />
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Tag className="size-4" />
              Labels
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setDeleting(true)}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        )}
      </header>

      {notFound ? (
        <div className="flex flex-col items-center gap-2 py-24 text-center text-muted-foreground">
          <AlertCircle className="size-6 text-destructive" />
          <p>{deleted ? "Topic deleted." : "Topic not found."}</p>
          <Link href="/" className="text-sm text-primary hover:underline">
            Back to topics
          </Link>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Radio}
              label="Published"
              value={formatCount(publishedTotal)}
              hint="messages total"
            />
            <StatCard
              icon={Factory}
              label="Producers"
              value={String(producerCount)}
              hint="active (recent)"
            />
            <StatCard
              icon={Users}
              label="Subscribers"
              value={String(topicSubs.length)}
              hint="bound subscriptions"
            />
            <StatCard
              icon={Waypoints}
              label="Deduplicated"
              value={formatCount(dedupTotal)}
              hint="publishes dropped"
            />
          </div>

          {/* Labels */}
          <section className="mb-6 rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Labels
            </h2>
            {topic.isLoading ? (
              <Skeleton className="h-6 w-64" />
            ) : Object.keys(topic.data?.labels ?? {}).length === 0 ? (
              <p className="text-sm text-muted-foreground">No labels.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(topic.data!.labels).map(([k, v]) => (
                  <Badge key={k} variant="outline" className="font-mono text-xs">
                    {k}={v}
                  </Badge>
                ))}
              </div>
            )}
          </section>

          {/* Subscribers */}
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Subscribers
              </h2>
              <span className="text-xs text-muted-foreground">
                {topicSubs.length} bound
              </span>
            </div>
            {subs.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : topicSubs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No subscriptions on this topic yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {topicSubs.map((s) => (
                  <li
                    key={s.subscriptionId}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <Waypoints className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-mono text-sm">
                      {s.subscriptionId}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      backlog{" "}
                      <span className="font-mono text-foreground">
                        {formatCount(s.backlog)}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      oldest{" "}
                      <span className="font-mono text-foreground">
                        {formatAge(s.oldestUnackedAgeSeconds)}
                      </span>
                    </span>
                    {s.deadLetteredTotal > 0 && (
                      <Badge variant="muted" className="shrink-0 text-destructive">
                        {formatCount(s.deadLetteredTotal)} dead-lettered
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${s.subscriptionId}`}
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteSubTarget(s.subscriptionId)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <EditLabelsDialog
        topicId={editing ? topicId : null}
        onOpenChange={(open) => {
          if (!open) setEditing(false);
        }}
      />

      <DeleteTopicDialog
        topicId={deleting ? topicId : null}
        isDeleting={del.isPending}
        error={del.isError ? (del.error as Error).message : null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(false);
            del.reset();
          }
        }}
        onConfirm={confirmDelete}
      />

      <DeleteSubscriptionDialog
        subscriptionId={deleteSubTarget}
        isDeleting={delSub.isPending}
        error={delSub.isError ? (delSub.error as Error).message : null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteSubTarget(null);
            delSub.reset();
          }
        }}
        onConfirm={confirmDeleteSub}
      />
    </div>
  );
}
