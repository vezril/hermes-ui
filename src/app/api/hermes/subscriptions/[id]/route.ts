import { NextRequest, NextResponse } from "next/server";

import { hermesFetch } from "@/lib/hermes/server/client";
import { proxyHermes } from "@/lib/hermes/server/http";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const subscriptionPath = (id: string) =>
  `/v1/subscriptions/${encodeURIComponent(id)}`;

function bffError(e: unknown): NextResponse {
  return NextResponse.json(
    { error: e instanceof Error ? e.message : "Hermes BFF error" },
    { status: 500 }
  );
}

/**
 * DELETE /api/hermes/subscriptions/{id} — DeleteSubscription. HermesMQ returns
 * 204 on success and 404 if the subscription is already gone; both pass through
 * proxyHermes (204 as status-only, 404 mapped straight through). The id stays
 * reserved afterwards — the broker rejects re-creating it because its journal
 * still holds the subscription's events — so a delete is not a name reset.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    return proxyHermes(
      await hermesFetch(subscriptionPath(id), { method: "DELETE" })
    );
  } catch (e) {
    return bffError(e);
  }
}
