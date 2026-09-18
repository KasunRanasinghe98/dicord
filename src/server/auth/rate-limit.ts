// In-memory fixed-window limiter. Good enough for a single-process pilot
// deployment, but does NOT work correctly on serverless platforms (Vercel)
// where each invocation can be a fresh instance with its own memory — the
// counters simply won't be shared. A real production deployment needs a
// shared store (e.g. Upstash Redis) for this to actually hold. Documented
// limitation, not silently pretended away.
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Cheap opportunistic cleanup so this map doesn't grow unbounded over a
// long-running dev/pilot process — not a real eviction policy, just enough
// to avoid a slow leak at pilot scale.
function pruneExpired(now: number) {
  if (buckets.size < 10_000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  pruneExpired(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
