# Hermes

The operator console for [HermesMQ](https://github.com/vezril/hermesmq) — a dark,
low-chrome Next.js UI over HermesMQ's REST admin API. Part of the Codex
constellation; it supersedes the Hermes module that previously lived inside
`zeus-ui`.

## Views

- **Topics** (`/`) — create, edit labels, delete, and list every topic.
- **Publish** (`/publish`) — publish a message to a topic and watch a live,
  non-destructive tap of its traffic; subscribe to the selected topic in place.
- **Topic detail** (`/topics/[id]`) — one topic in full: labels, published
  volume, active producers, and the subscriptions bound to it (with queue
  health).
- **Statistics** (`/stats`) — broker-wide totals plus per-topic and
  per-subscription breakdowns.

## Architecture

The browser never talks to HermesMQ directly. A same-origin **BFF** (the
Node-runtime `/api/hermes/*` route handlers) proxies HermesMQ's `/v1` admin API
and `/metrics` exposition, injecting the `HERMES_TOKEN` bearer server-side. The
token is server-only and never exposed as a `NEXT_PUBLIC_*` variable.

The client layer (`src/lib/hermes`) is selected at runtime: with
`NEXT_PUBLIC_HERMES_API_BASE` set it uses the live HTTP client; unset, it falls
back to in-memory **fixtures**, so the whole UI is navigable with no HermesMQ
running.

Producer identities have no REST listing in HermesMQ — the per-topic
active-producer *count* comes only from the `hermesmq_topic_producers` Prometheus
gauge, which is why `/metrics` is a first-class data source here (parsed by
`src/lib/hermes/metrics.ts`), not just a dashboard feed.

## Develop

```bash
npm install
cp .env.example .env.local   # optional — omit to run on fixtures
npm run dev
```

- `npm run build` — production build (standalone output for Docker).
- `npm run typecheck` — `tsc --noEmit`.
- `npm run lint` — Next.js ESLint.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 ·
TanStack Query v5 · Radix primitives.
