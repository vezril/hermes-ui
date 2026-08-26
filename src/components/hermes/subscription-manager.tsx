"use client";

import * as React from "react";
import { AlertCircle, Loader2, Trash2, Waypoints } from "lucide-react";

import type { Subscription } from "@/lib/hermes";
import {
  useDeleteSubscription,
  useSubscriptions,
} from "@/lib/hooks/use-subscriptions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CreateSubscriptionDialog } from "./create-subscription-dialog";
import { DeleteSubscriptionDialog } from "./delete-subscription-dialog";

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

interface Row extends Subscription {
  syncing: boolean;
  deleting: boolean;
}

/** A labelled metric cell (never color-only — always a number + label). */
function Metric({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex flex-col items-end">
      <span
        className={cn(
          "font-mono text-sm tabular-nums",
          emphasize ? "text-destructive" : "text-foreground"
        )}
      >
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

/**
 * Hermes subscriptions operator view. Lists each subscription with its topic and
 * queue health — backlog (depth), oldest-unacked age, redelivered, and
 * dead-lettered (emphasized when > 0) — and lets an operator create or delete
 * one. The listing is an eventually-consistent stats projection, so a created
 * subscription is shown optimistically with a "syncing" badge and a deleted one
 * with a "deleting" badge until the projection catches up.
 */
export function SubscriptionManager() {
  const { data, isLoading, isError, error, refetch } = useSubscriptions();
  const del = useDeleteSubscription();
  const [pendingCreate, setPendingCreate] = React.useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = React.useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

  const listed = React.useMemo(() => data ?? [], [data]);
  const listedIds = React.useMemo(
    () => new Set(listed.map((s) => s.subscriptionId)),
    [listed]
  );

  // The pending sets record what this session did; what is still *unsettled* is
  // derived against the latest projection rather than reconciled back into
  // state by an effect (React 19 rejects a synchronous setState in an effect
  // body as a cascading render — react-hooks/set-state-in-effect). Because the
  // raw sets are no longer pruned, each handler below drops the id from the
  // opposite set so a re-create can't resurrect a settled "deleting" badge.
  const syncingIds = React.useMemo(
    () => pendingCreate.filter((id) => !listedIds.has(id)),
    [pendingCreate, listedIds]
  );
  const deletingIds = React.useMemo(
    () => pendingDelete.filter((id) => listedIds.has(id)),
    [pendingDelete, listedIds]
  );

  // Poll the projection while anything is settling.
  React.useEffect(() => {
    if (syncingIds.length === 0 && deletingIds.length === 0) return;
    const timer = setInterval(() => void refetch(), 1500);
    return () => clearInterval(timer);
  }, [syncingIds.length, deletingIds.length, refetch]);

  const rows: Row[] = React.useMemo(() => {
    const base: Row[] = listed.map((s) => ({
      ...s,
      syncing: false,
      deleting: deletingIds.includes(s.subscriptionId),
    }));
    const extra: Row[] = syncingIds.map((id) => ({
      subscriptionId: id,
      topicId: "…",
      backlog: 0,
      oldestUnackedAgeSeconds: 0,
      redeliveredTotal: 0,
      deadLetteredTotal: 0,
      syncing: true,
      deleting: false,
    }));
    return [...base, ...extra].sort((a, b) =>
      a.subscriptionId.localeCompare(b.subscriptionId)
    );
  }, [listed, syncingIds, deletingIds]);

  function markCreated(id: string) {
    setPendingDelete((prev) => prev.filter((p) => p !== id));
    setPendingCreate((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget;
    try {
      await del.mutateAsync(id);
      setPendingCreate((prev) => prev.filter((p) => p !== id));
      setPendingDelete((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setDeleteTarget(null);
    } catch {
      // Surfaced in the dialog.
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Waypoints className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Subscriptions
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Queue health across HermesMQ subscriptions.
            </p>
          </div>
        </div>
        <CreateSubscriptionDialog onCreated={markCreated} />
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 py-24 text-center text-muted-foreground">
          <AlertCircle className="size-6 text-destructive" />
          <p>Couldn&apos;t load subscriptions.</p>
          <p className="text-xs">{(error as Error)?.message}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-24 text-center text-sm text-muted-foreground">
          No subscriptions yet. Create the first one.
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {rows.map((s) => (
            <li
              key={s.subscriptionId}
              className={cn(
                "flex items-center gap-4 bg-card px-4 py-3 transition-colors hover:bg-accent/40",
                s.deleting && "opacity-50"
              )}
            >
              <Waypoints className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-sm">
                  {s.subscriptionId}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  → {s.topicId}
                </div>
              </div>
              {s.syncing ? (
                <Badge variant="muted" className="shrink-0">
                  <Loader2 className="size-3 animate-spin" />
                  syncing
                </Badge>
              ) : s.deleting ? (
                <Badge variant="muted" className="shrink-0">
                  <Loader2 className="size-3 animate-spin" />
                  deleting
                </Badge>
              ) : (
                <div className="flex shrink-0 items-center gap-5">
                  <Metric label="depth" value={formatCount(s.backlog)} />
                  <Metric
                    label="oldest"
                    value={formatAge(s.oldestUnackedAgeSeconds)}
                  />
                  <Metric
                    label="redeliv"
                    value={formatCount(s.redeliveredTotal)}
                  />
                  <Metric
                    label="dead-letter"
                    value={formatCount(s.deadLetteredTotal)}
                    emphasize={s.deadLetteredTotal > 0}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${s.subscriptionId}`}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(s.subscriptionId)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <DeleteSubscriptionDialog
        subscriptionId={deleteTarget}
        isDeleting={del.isPending}
        error={del.isError ? (del.error as Error).message : null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            del.reset();
          }
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
