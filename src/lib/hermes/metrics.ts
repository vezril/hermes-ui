/**
 * Prometheus text-exposition parser for HermesMQ's `/metrics` endpoint, plus the
 * structured shape the statistics and topic-detail views consume. HermesMQ has
 * no REST listing of producer identities — the per-topic active-producer *count*
 * lives only in the `hermesmq_topic_producers` gauge — so metrics are a
 * first-class data source here, not just dashboards. The BFF `/api/hermes/metrics`
 * route proxies the raw text; this parser runs on whatever holds it.
 */

/** HermesMQ's exposition, projected onto the series the UI actually reads. */
export interface HermesMetrics {
  /** hermesmq_messages_published_total{topic} */
  publishedByTopic: Record<string, number>;
  /** hermesmq_topic_producers{topic} — active-producer count (activity window). */
  producersByTopic: Record<string, number>;
  /** hermesmq_publish_deduplicated_total{topic} */
  dedupByTopic: Record<string, number>;
  /** hermesmq_subscription_consumers{subscription} — active-consumer count. */
  consumersBySub: Record<string, number>;
  /** hermesmq_subscription_backlog{subscription} */
  backlogBySub: Record<string, number>;
  /** hermesmq_subscription_oldest_unacked_age_seconds{subscription} */
  oldestUnackedBySub: Record<string, number>;
  /** hermesmq_messages_redelivered_total{subscription} */
  redeliveredBySub: Record<string, number>;
  /** hermesmq_messages_dead_lettered_total{subscription} */
  deadLetteredBySub: Record<string, number>;
}

export function emptyMetrics(): HermesMetrics {
  return {
    publishedByTopic: {},
    producersByTopic: {},
    dedupByTopic: {},
    consumersBySub: {},
    backlogBySub: {},
    oldestUnackedBySub: {},
    redeliveredBySub: {},
    deadLetteredBySub: {},
  };
}

/** Which parsed bucket each metric name feeds, and which label carries the key. */
const ROUTES: Record<string, { bucket: keyof HermesMetrics; label: string }> = {
  hermesmq_messages_published_total: { bucket: "publishedByTopic", label: "topic" },
  hermesmq_topic_producers: { bucket: "producersByTopic", label: "topic" },
  hermesmq_publish_deduplicated_total: { bucket: "dedupByTopic", label: "topic" },
  hermesmq_subscription_consumers: { bucket: "consumersBySub", label: "subscription" },
  hermesmq_subscription_backlog: { bucket: "backlogBySub", label: "subscription" },
  hermesmq_subscription_oldest_unacked_age_seconds: {
    bucket: "oldestUnackedBySub",
    label: "subscription",
  },
  hermesmq_messages_redelivered_total: { bucket: "redeliveredBySub", label: "subscription" },
  hermesmq_messages_dead_lettered_total: { bucket: "deadLetteredBySub", label: "subscription" },
};

/** Parse one `name{labels} value` sample line into name, labels, and value. */
function parseLine(line: string): { name: string; labels: Record<string, string>; value: number } | null {
  const braceOpen = line.indexOf("{");
  let name: string;
  let labelPart = "";
  let rest: string;
  if (braceOpen >= 0) {
    const braceClose = line.lastIndexOf("}");
    if (braceClose < braceOpen) return null;
    name = line.slice(0, braceOpen).trim();
    labelPart = line.slice(braceOpen + 1, braceClose);
    rest = line.slice(braceClose + 1).trim();
  } else {
    const sp = line.indexOf(" ");
    if (sp < 0) return null;
    name = line.slice(0, sp).trim();
    rest = line.slice(sp + 1).trim();
  }
  const value = Number(rest.split(/\s+/)[0]);
  if (!Number.isFinite(value)) return null;
  return { name, labels: parseLabels(labelPart), value };
}

/** Parse `k="v",k2="v2"` label text, unescaping Prometheus `\\` and `\"`. */
function parseLabels(text: string): Record<string, string> {
  const labels: Record<string, string> = {};
  const re = /([a-zA-Z_][a-zA-Z0-9_]*)="((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    labels[m[1]] = m[2].replace(/\\(.)/g, "$1");
  }
  return labels;
}

/** Parse a HermesMQ Prometheus exposition into the structured {@link HermesMetrics}. */
export function parseMetrics(text: string): HermesMetrics {
  const out = emptyMetrics();
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const parsed = parseLine(line);
    if (!parsed) continue;
    const route = ROUTES[parsed.name];
    if (!route) continue;
    const key = parsed.labels[route.label];
    if (key === undefined) continue;
    out[route.bucket][key] = parsed.value;
  }
  return out;
}
