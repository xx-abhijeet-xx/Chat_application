// In-memory rate limiter — no Redis dependency
const limits = new Map<string, { count: number; reset: number }>();

export async function checkRate(userId: string): Promise<boolean> {
  const now = Date.now();
  const rl  = limits.get(userId);
  if (!rl || now > rl.reset) { limits.set(userId, { count: 1, reset: now + 60_000 }); return true; }
  if (rl.count >= 60) return false;
  rl.count++;
  return true;
}
