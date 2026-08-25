# Deploy

Hermes ships its own Helm chart; Codex operates it on the homelab cluster.

- `charts/hermes/` — the app's Helm chart: a `Deployment` (pinned to a Docker Hub
  image tag), a `ClusterIP` `Service`, and an optional `Ingress`.
- `flux/hermes-helmrelease.yaml` — a **reference** Flux `GitRepository` +
  `HelmRelease` that sources `charts/hermes` and pins the image tag.

## Cluster reality

The homelab is a single-node **k3s 1.21** on QNAP Container Station, with **no
Flux and no cert-manager** yet (Flux is deferred until a k3s upgrade). So today:

- Deploys are **manual** `helm upgrade --install` (git stays the source of truth);
  the reference HelmRelease documents the values to mirror.
- **Ingress is OFF by default** — there is no ingress TLS. Reach the console via
  `kubectl port-forward` or a NodePort. The ingress block is kept in the chart
  (plain-HTTP when `clusterIssuer`/`tlsSecretName` are empty; cert-manager TLS
  when they are set) for when TLS exists.
- **replicaCount: 1** (single node).

## Deploy (manual, current)

```sh
helm upgrade --install hermes deploy/charts/hermes \
  -n hermes-ui --create-namespace \
  --set image.tag=0.1.0 \
  --set hermes.endpoint=http://hermesmq.hermesmq.svc.cluster.local:8080

# then, until an ingress exists:
kubectl -n hermes-ui port-forward svc/hermes-hermes 8080:80
```

## Local render / lint

```sh
helm lint deploy/charts/hermes
helm template hermes deploy/charts/hermes \
  --set image.tag=0.1.0 \
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
