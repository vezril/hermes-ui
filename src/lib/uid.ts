/**
 * Small unique-id helper for client-side keys (tap observations, publish ids in
 * fixtures). Uses the platform UUID when available, with a non-crypto fallback
 * for older runtimes. Never used for anything security-sensitive.
 */
export function uid(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `id-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}
