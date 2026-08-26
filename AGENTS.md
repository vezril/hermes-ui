# AGENTS.md — hermes-ui handoff for LLMs

> **Purpose.** This is the single onboarding doc for any LLM/agent (Claude first) picking up
> hermes-ui. It captures what the app is, how it's built, the conventions it must follow, and how
> to ship a change end-to-end. **Keep it current: update this file in the same PR as every new
> feature or material change** (see [Maintaining this file](#maintaining-this-file)).

## What this is

**hermes-ui** is the standalone operator console for **HermesMQ** (an event-sourced CQRS pub/sub
broker; Scala 3 + Apache Pekko; repo `vezril/hermesmq`). It's part of the **Codex constellation**
of god-named services. It replaced a Hermes module that used to live inside `zeus-ui` (zeus is now
deprecated entirely). Repo: `github.com/vezril/hermes-ui`.

Stack: **Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind v4 · TanStack Query v5
· Radix + cva/clsx/tailwind-merge · Geist fonts**. Node 22.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000 — runs on in-memory FIXTURES by default
npm run build      # production build (output: standalone)
npm run typecheck  # tsc --noEmit
npm run lint       # next lint (eslint)
```

Runs fully offline on fixtures with no HermesMQ. To point at a live broker via the BFF, set
`NEXT_PUBLIC_HERMES_API_BASE=/api/hermes` and the server-side `HERMES_ENDPOINT` (see `.env.example`).

## Architecture

- **BFF secret boundary.** The browser only ever calls the app's own **same-origin `/api/hermes/*`
  routes** (Node-runtime route handlers). Those proxy HermesMQ's REST admin API and inject the
  `HERMES_TOKEN` bearer server-side. The token/endpoint **never** reach the browser and are **never**
  `NEXT_PUBLIC_*`. `src/lib/hermes/server/client.ts` (`hermesFetch`) is the server-only egress.
- **Client seam (fixtures vs live).** `src/lib/hermes/` defines a typed `HermesClient` interface
  (`client.ts`). `index.ts` selects the impl at runtime: `httpHermesClient` (`http.ts`, calls the
  BFF) when `NEXT_PUBLIC_HERMES_API_BASE` is set, else `fixtureHermesClient` (`fixtures.ts`,
  in-memory seed data). Components/hooks only ever use `getHermesClient()`.
- **`NEXT_PUBLIC_HERMES_API_BASE` is baked at BUILD time** (Next inlines `NEXT_PUBLIC_*` into the
  browser bundle). The Dockerfile bakes `/api/hermes`, so the shipped image uses the live BFF. A
  runtime env of the same name only governs the server tier's copy — keep them in sync.
- **Metrics.** HermesMQ has no REST listing of producer identities — the per-topic active-producer
  count lives only in the `hermesmq_topic_producers` Prometheus gauge. `src/lib/hermes/metrics.ts`
  parses the `/metrics` text exposition; it feeds the Statistics and Topic-detail views.
- **Eventual consistency.** Topic/subscription listings are HermesMQ's stats projection. Writes use
  optimistic insert + a visible "syncing"/"deleting" badge until the projection catches up.

## Views & routes

| Route | View |
|---|---|
| `/` | **Topics** — create / edit-labels / delete / list (`topic-manager.tsx`) |
| `/publish` | **Publish** — publish + live non-destructive SSE tap; subscribe in place (`playground.tsx`) |
| `/subscriptions` | **Subscriptions** — queue health; create / delete (`subscription-manager.tsx`) |
| `/topics/[id]` | **Topic detail** — labels, published volume, active producers, bound subscribers (with delete) (`topic-detail.tsx`) |
| `/stats` | **Statistics** — broker-wide totals + per-topic/-subscription tables (`statistics.tsx`) |
| `/docs` | **API reference** — Scalar UI over the OpenAPI spec (`app/docs/page.tsx`) |

Chrome: a persistent **left sidebar** (`hermes-sidebar.tsx`) — god mark top-left, vertical nav,
health pill at the bottom, collapses to an icon rail below `sm`; plus a faint mark watermark behind
the main view. This layout is the constellation house style (see UX standards).

## The BFF API (`/api/hermes/*`)

Documented by an **OpenAPI 3.0 spec** — the source of truth is `src/lib/hermes/openapi.ts`, served
as JSON at **`GET /api/hermes/openapi`** and rendered at **`/docs`**. An **Insomnia collection** is
at `docs/hermes-ui.insomnia.json` (import it, or import the OpenAPI URL directly). Endpoints:

- `GET/POST /topics`, `GET/PATCH/DELETE /topics/{id}`
- `GET/POST /subscriptions`, `DELETE /subscriptions/{id}` (deleted ids stay **reserved** — the
  broker journal keeps their events; recreate with the same name is refused)
- `POST /publish`, `GET /tap?topic=…` (SSE)
- `GET /health`, `GET /metrics`, `GET /openapi`

**When you change a route, update `src/lib/hermes/openapi.ts` and the Insomnia collection to match.**

**Audience note:** the BFF is the *console's* API (same-origin, token injected server-side) — it is
not the integration surface for other services. Services talk to the broker directly using the
**official HermesMQ clients** (Scala / Python 3 / JS) that live in the `hermesmq` repo — see
Constellation coordination below.

## Code map

```
src/
  app/
    layout.tsx            # root: sidebar + main + watermark; Geist fonts; dark
    globals.css           # theme tokens (see UX standards)
    icon.png              # favicon = the Hermes god mark
    page.tsx, publish/, subscriptions/, topics/[id]/, stats/, docs/   # the views
    api/hermes/*/route.ts # the BFF routes (Node runtime)
  components/hermes/       # all feature UI (managers, dialogs, playground, sidebar, health pill)
  components/ui/           # shadcn-style kit (button, dialog, badge, input, skeleton, tooltip, sheet)
  lib/hermes/              # client seam: client.ts, http.ts, fixtures.ts, index.ts, types.ts,
                           #   metrics.ts, openapi.ts, validation.ts, inspector.ts, server/*
  lib/hooks/               # use-topics, use-subscriptions, use-metrics (TanStack Query)
deploy/                    # Helm chart (charts/hermes) + reference HelmRelease + README
docs/                      # openapi consumers: the Insomnia collection
openspec/                  # OpenSpec spec-driven workflow config
```

## UX standards (must follow)

Canonical doc: **`codex/docs/ux-standards.md`** (in the sibling `codex` repo). Reference
implementation: **`dionysus-planner/app/globals.css`**. In one line: *one shared cyberpunk dark base,
one god accent per service.*

- **Dark only.** Shared hue-280 near-black-violet ground (`--background: oklch(0.13 0.02 280)` ≈
  `#06060F`, the value the god marks are keyed to). Sharp radius `0.15rem`. Family **cyan** on
  `--chart-1`. Copy the base `:root` from the reference.
- **Hermes accent = GREEN** `oklch(0.8 0.25 145)` (≈ `#0AE442`) on `--primary`/`--ring`/
  `--sidebar-primary`, dark foreground. (Amber is Demeter's — don't use it here.)
- **Neon focus ring** (verbatim from the standard) + `glow-primary` on the active nav item.
- **Geist Sans/Mono** via `next/font`. **Favicon = the god mark**; the mark is the only logo (the
  wordmark text is a decorative `aria-hidden` accent label).
- **Status is never color-only** — pair every status color with text/icon. Extra important here
  because the green accent coincides with the shared success-green, so green is ambient. Destructive
  and status use the **shared** red/amber, never the accent.
- **Async truthfulness** — optimistic writes show a visible syncing/deleting badge; destructive
  actions get a confirm dialog. Loading = skeletons; empty/error states are designed, not blank.
- **Pantheon-as-art rule:** god marks (`codex/docs/brand/*.png`, dionysus `brand-prompts.md`
  sections) are a permanent collection for ALL gods, even serviceless ones. On deprecation, service
  references get removed but the art stays.

## Dev workflow

Spec-driven (OpenSpec) constellation convention. For a feature:

1. Branch off **`development`** (the working branch). Both `development` and `main` are protected
   (PR required; CI must pass; no direct push).
2. Implement (TDD where it fits — this is a UI app; verify with typecheck/lint/build + in-browser on
   fixtures via the Browser tools).
3. PR → **`development`**. Required CI checks: **Lint (eslint)**, **Type-check (tsc)**,
   **Build (next build)**, **Helm chart**. Squash-merge feature PRs.
4. **Update `AGENTS.md`** in the same PR.

Larger/spec-worthy work can go through `/opsx:propose` → `/opsx:apply` → `/opsx:archive`
(`openspec/` is scaffolded; `openspec/config.yaml` carries the project context).

## Release & deploy

`git = source of truth`. Codex operates the cluster (single-node k3s 1.21 on a QNAP; **no Flux** —
manual `helm upgrade`).

**Cutting a release (vX.Y.Z):**
1. `development` is behind `main` by `main`'s prior promotion merge node → **back-merge first**:
   branch off development, `git merge origin/main`, bump `package.json` version, PR → development,
   **merge as a MERGE commit** (not squash — squash would drop main's node and defeat the sync).
2. Promotion PR `development` → `main`; CI green; **merge (merge commit)**.
3. Tag `vX.Y.Z` on `main` + push → `release.yml` publishes `calvinference/hermesui:X.Y.Z` + `:latest`
   to Docker Hub (semver-immutability guard, on-main ancestry check). Create a GitHub Release.
4. Ping the Codex session to deploy.

**Deploy gotcha:** `helm upgrade` **replaces** user-supplied values wholesale. Deploy from the full
`apps/hermes-ui` values (`-f`), never a bare `--set image.tag=X` — that once silently deleted the
tailnet ingress. Codex keeps the deploy pin at **what's deployed**, not the newest tag: docs-only
releases are published but intentionally NOT rolled (they become the base for the next behavioral
release). Image account is **`calvinference`** (Docker Hub user), even though the GitHub org is
`vezril`.

**Runtime:** namespace `hermes-ui`; broker at `http://hermesmq.hermesmq.svc.cluster.local:8080`
(auth off today, so no `HERMES_TOKEN`). Tailnet access: `http://hermes.tailscale:61642` — that host
is a per-client `/etc/hosts` entry → the QNAP's tailnet IP; Traefik routes by Host header. Never
port 80 (the QNAP's nginx owns it and 200s any Host). Stopgap access:
`kubectl -n hermes-ui port-forward svc/hermes-hermes 8080:80`.

## Constellation coordination

- **Codex** owns the GitOps repo (`apps/*`), the deploy pins, the shared brand assets, and
  `ux-standards.md`. Ping the codex session (via SendMessage to a `codex-*` peer) for deploys and
  cross-service/doc changes.
- The **broker is `hermesmq`**; other services publish to it (e.g. Demeter → `demeter-deals`,
  Artemis → `media.*` topics + `artemis.media.*` subs). The console shows whatever is live on the
  broker.
- **Official broker clients** (added 2026-08-26): the `hermesmq` repo ships one client per
  constellation language — Scala (the `client` sbt module), Python 3 (`clients/python`,
  `pip install "hermesmq-client @ git+https://github.com/vezril/hermesmq#subdirectory=clients/python"`),
  and JS (`clients/js`, `@hermesmq/client`, zero-dep ESM, vendorable). Matrix + conformance
  contract: `hermesmq/clients/README.md`. Point integrating services there instead of letting them
  hand-roll `/v1` calls — and note hermes-ui itself does NOT use these (its own
  `src/lib/hermes/` seam + BFF predate them and serve a different job: fixtures, SSE tap, browser
  secret-boundary). A broker API change updates **all three clients + their stubs + the openspec
  client specs in the same hermesmq PR** (the update-all-three rule).
- Peer sessions come and go; verify reachability with `ListAgents` before `SendMessage`. On the
  shared machine, peers can be identified by cwd (`lsof -p <pid-from /tmp/cc-socks/*.sock> -d cwd`),
  but only `ListAgents` confirms messageability.

## How to add a feature (recipe)

For a new broker-backed action, mirror the existing delete-subscription/topic flow:

1. **Client seam:** add the method to `HermesClient` (`client.ts`) + implement in both `http.ts`
   (calls the BFF) and `fixtures.ts` (in-memory; keep fixtures faithful, e.g. reserved-id tombstones).
2. **BFF route:** add/extend a handler under `src/app/api/hermes/…/route.ts` (proxy via `hermesFetch`
   + `proxyHermes`/`hermesErrorResponse`).
3. **Hook:** a TanStack Query hook in `src/lib/hooks/` (invalidate the relevant query on mutate).
4. **UI:** component(s) in `src/components/hermes/`, following the UX standards (confirm dialog for
   destructive, syncing badge for optimistic, status-with-text).
5. **Docs:** update `src/lib/hermes/openapi.ts` + `docs/hermes-ui.insomnia.json`.
6. **Verify:** `typecheck` + `lint` + `build`, and eyeball on fixtures in the Browser.
7. **This file:** add the feature to the inventory below and adjust any section it changes.

## Current state (keep updated)

- **Latest release:** `v0.1.8` (`calvinference/hermesui:0.1.8`) — Next 16.3.3 upgrade (clears the
  postcss/sharp advisories) + React hooks-rule fixes (badge pruning derived, not set-in-effect).
  **Deployed in cluster:** `0.1.8` (Codex fleet roll, helm rev 11; route + `/docs` + CRUD verified).
- **Feature inventory:** topics CRUD; subscriptions create/list/delete (Subscriptions view **and**
  topic-detail subscribers list); publish + live SSE tap; topic detail (producers/subscribers);
  statistics; UX-standards green retheme (sidebar + mark + watermark + Geist + favicon); API docs
  (OpenAPI + `/docs` Scalar page + Insomnia collection).
- **Open, non-blocking:** `release.yml` actions warn on Node-20 deprecation (cosmetic).

## Maintaining this file

Whoever ships a change updates `AGENTS.md` **in the same PR**: bump *Current state*, extend the
feature inventory, and revise any section the change affects (routes, code map, API, workflow). Treat
a stale AGENTS.md as a bug — the next agent relies on it being true.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
