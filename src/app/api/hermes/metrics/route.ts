import { NextResponse } from "next/server";

import { hermesFetch } from "@/lib/hermes/server/client";
import { hermesErrorResponse } from "@/lib/hermes/server/http";

export const runtime = "nodejs";

/**
 * GET /api/hermes/metrics — HermesMQ's Prometheus `/metrics` exposition via the
 * BFF, forwarded as raw `text/plain`. The browser-side {@link parseMetrics}
 * turns it into structured series; keeping the parse client-side means the
 * fixtures and live paths share one parser. This is the only source of the
 * per-topic active-producer count.
 */
export async function GET() {
  try {
    const res = await hermesFetch("/metrics");
    if (!res.ok) return hermesErrorResponse(res);
    const text = await res.text();
    return new NextResponse(text, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  } catch {
    return NextResponse.json(
      { error: "HermesMQ is unreachable", hermesStatus: 503 },
      { status: 503 }
    );
  }
}
