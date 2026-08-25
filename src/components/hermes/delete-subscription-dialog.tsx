"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Delete-subscription confirmation. Deleting a subscription drops its (unackable)
 * backlog and removes it from the listing. The id stays reserved afterwards — the
 * broker rejects re-creating a deleted subscription because its journal still
 * holds the events — so the copy warns that this is not a way to reset a name.
 */
export function DeleteSubscriptionDialog({
  subscriptionId,
  isDeleting,
  error,
  onOpenChange,
  onConfirm,
}: {
  subscriptionId: string | null;
  isDeleting: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const open = subscriptionId !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            Delete subscription
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          <p>
            Delete{" "}
            <span className="font-mono font-medium text-foreground">
              {subscriptionId}
            </span>
            ? This drops its backlog and cannot be undone.
          </p>
          <p className="text-xs text-muted-foreground">
            The id stays reserved — you can&apos;t create a new subscription with
            the same name later.
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            {isDeleting ? "Deleting…" : "Delete subscription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
