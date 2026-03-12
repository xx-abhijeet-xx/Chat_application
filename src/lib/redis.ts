// Redis is optional — if REDIS_URL is missing, operations silently no-op.
// The WS server uses in-memory broadcast in that case.

let _redis: any = null;

async function getRedis() {
  if (!process.env.REDIS_URL) return null;
  if (_redis) return _redis;
  try {
    const Redis = (await import("ioredis")).default;
    _redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableReadyCheck: false,
      tls: process.env.REDIS_URL.startsWith("rediss://") ? {} : undefined,
    });
    await _redis.connect();
    return _redis;
  } catch {
    return null;
  }
}

export async function checkRate(userId: string): Promise<boolean> {
  const r = await getRedis();
  if (!r) return true; // no Redis → no rate limiting
  try {
    const n = await r.incr(`rl:${userId}`);
    if (n === 1) await r.expire(`rl:${userId}`, 60);
    return n <= 60;
  } catch { return true; }
}

export async function setPresence(userId: string): Promise<void> {
  const r = await getRedis();
  if (!r) return;
  try { await r.setex(`presence:${userId}`, 35, "1"); } catch {}
}

export const K   = { conv: (id: string) => `conv:${id}`, presence: (id: string) => `presence:${id}` };
export const TTL = { presence: 35, rateLimit: 60 };
// Named exports for legacy imports
export const redis      = { incr: async () => 0, expire: async () => 0, setex: async () => 0, del: async () => 0 };
export const publisher  = { publish: async () => 0 };
export const subscriber = { subscribe: async () => 0, on: () => {} };
