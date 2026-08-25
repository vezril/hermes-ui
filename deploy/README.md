# Deploy

Hermes ships its own Helm chart; Codex operates it on the homelab cluster.

- `charts/hermes/` — the app's Helm chart: a `Deployment` (pinned to a Docker Hub
  image tag), a `ClusterIP` `Service`, and an optional `Ingress`.
- `flux/hermes-helmrelease.yaml` — a **reference** Flux `GitRepository` +
  `HelmRelease` that sources `charts/hermes` and pins the image tag.

## Cluster reality

The homelab is a single-node **k3s 1.21** on QNAP Container Station, with **no
Flux and no cert-manager** yet (Flux is deferred until a k3s upgrade). So today:

- Deploys are **manual** `helm upgrade --install` (git stays the source of truth),
  always with the **full desired values** via `-f` — never a bare `--set` (see the
  warning below). The reference HelmRelease documents the values to mirror.
- **Ingress is OFF by default** — there is no ingress TLS. Reach the console via
  `kubectl port-forward` or a NodePort. The ingress block is kept in the chart
  (plain-HTTP when `clusterIssuer`/`tlsSecretName` are empty; cert-manager TLS
  when they are set) for when TLS exists.
- **replicaCount: 1** (single node).

## Deploy (manual, current)

> **⚠️ Deploy with the full desired values (`-f`), never a bare `--set`.**
> `helm upgrade` **replaces the release's user-supplied values wholesale** — it
> does *not* merge your new flags with the previous release's values. So a
> `helm upgrade --set image.tag=X` that omits the operational values (ingress,
> endpoint, replicas, …) **drops them**. That is exactly how a tag-bump once
> silently deleted the console's tailnet ingress. Always pass the full desired
> state via `-f <values>`; use `--set` only to override a field *on top of* that
> file. The canonical values live in the codex GitOps repo under
> `apps/hermes-ui` (mirrored from `flux/hermes-helmrelease.yaml` here).

```sh
# Full desired state from a values file is the source of truth; --set only layers
# a single-field override (the tag) on top of it — it never replaces the file.
helm upgrade --install hermes deploy/charts/hermes \
  -n hermes-ui --create-namespace \
  -f path/to/hermes-ui-values.yaml \
  --set image.tag=0.1.4

# If no ingress is configured in your values, reach the console via port-forward:
kubectl -n hermes-ui port-forward svc/hermes-hermes 8080:80
```

A minimal values file (endpoint + the current image tag) looks like:

```yaml
# hermes-ui-values.yaml
image:
  tag: 0.1.4
hermes:
  endpoint: http://hermesmq.hermesmq.svc.cluster.local:8080
# ...plus ingress/replicas/etc. — everything the release should have, since
# --set/-f do not merge with the previous release.
```

## Local render / lint

`--set` is fine here — `helm template`/`helm lint` only render the chart locally;
there is no release state to replace (the warning above is only about `upgrade`).

```sh
helm lint deploy/charts/hermes
helm template hermes deploy/charts/hermes \
  --set image.tag=0.1.4 \
  --set hermes.endpoint=http://hermesmq.hermesmq.svc.cluster.local:8080
```

## Config

Hermes is a Backend-for-Frontend, so its config splits between the browser and
the server tier (see `.env.example`):

- `hermes.apiBase` → `NEXT_PUBLIC_HERMES_API_BASE` — the browser client selector
  (non-secret, same-origin `/api/hermes`). **Inlined at image _build_ time** (the
  Dockerfile bakes `/api/hermes`); the chart's runtime env only governs the
  server tier's copy, so keep the two in sync.
- `hermes.endpoint` → `HERMES_ENDPOINT` — HermesMQ's REST base URL (server-side).
  HermesMQ serves HTTP on **8080**; its Service and namespace are both `hermesmq`.
- `hermes.token.secretName` → `HERMES_TOKEN` from a Kubernetes **Secret** — the
  bearer token stays server-side, never plaintext and never `NEXT_PUBLIC_`. The
  broker runs with auth disabled today, so it is omitted.

The browser only ever talks to Hermes's `/api/hermes/*` routes; HermesMQ's
endpoint and token never reach it.
