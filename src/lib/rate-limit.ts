/**
 * Rate limit simples em memória (janela fixa).
 * Suficiente para proteger o webhook no MVP single-instance.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  bucket.count += 1;
  if (bucket.count > limit) return { allowed: false, remaining: 0 };
  return { allowed: true, remaining: limit - bucket.count };
}
