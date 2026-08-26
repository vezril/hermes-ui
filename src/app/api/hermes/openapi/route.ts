import { NextResponse } from "next/server";

import { openapiSpec } from "@/lib/hermes/openapi";

export const runtime = "nodejs";

/**
 * GET /api/hermes/openapi — the OpenAPI 3.0 document for this BFF, as JSON. The
 * `/docs` page renders it, and it can be imported directly into Insomnia/Postman.
 * Static content, so it's cacheable.
 */
export function GET() {
  return NextResponse.json(openapiSpec, {
    headers: { "cache-control": "public, max-age=300" },
  });
}
