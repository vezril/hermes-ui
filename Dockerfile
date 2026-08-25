# Hermes — multi-stage build producing a small standalone Next.js server image.
# The standalone server also hosts the Node-runtime BFF routes (/api/hermes/*)
# that proxy HermesMQ's REST admin API and /metrics (the HERMES_TOKEN secret
# boundary). Published to Docker Hub as <user>/hermesui by the release workflow;
# deployed by Codex behind Traefik + cert-manager TLS.

# ---- deps: install production + build dependencies ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: compile the app into a standalone bundle ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* values are inlined into the browser bundle at BUILD time (not
# read from the container env at runtime), so the live-BFF selector must be baked
# here. Without this the shipped image would silently fall back to in-browser
# fixtures. The same-origin path is not a secret; the HERMES_TOKEN/endpoint stay
# server-side (runtime env). The Helm chart also sets this env, which then only
# affects the server tier's copy — the browser value is whatever is baked here.
ENV NEXT_PUBLIC_HERMES_API_BASE=/api/hermes
RUN npm run build

# ---- runner: minimal runtime ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as an unprivileged user.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# The standalone output includes a minimal server.js + traced node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
