/**
 * In-Memory Rate Limiter (Replaces DB-backed limiter to prevent DB DoS)
 * Returns { allowed: boolean, remaining: number }
 */

interface RateLimitRecord {
  count: number;
  expiresAt: number;
}

// Use globalThis to persist the map across Next.js HMR (Hot Module Replacement)
const rateLimitCache: Map<string, RateLimitRecord> = (globalThis as any).__rateLimitCache || new Map();
if (!(globalThis as any).__rateLimitCache) {
  (globalThis as any).__rateLimitCache = rateLimitCache;
}

// Періодичне очищення старих записів для запобігання витоку пам'яті (Memory Leak)
if (!(globalThis as any).__rateLimitCleanup) {
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitCache.entries()) {
      if (record.expiresAt < now) {
        rateLimitCache.delete(key);
      }
    }
  }, 5 * 60 * 1000); // Очищення кожні 5 хвилин
  // Не блокуємо процес Node.js
  if (cleanupInterval.unref) cleanupInterval.unref();
  (globalThis as any).__rateLimitCleanup = true;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const now = Date.now();
    let record = rateLimitCache.get(key);

    // Якщо запису немає або він протермінований
    if (!record || record.expiresAt < now) {
      record = { count: 1, expiresAt: now + windowMs };
      rateLimitCache.set(key, record);
      return { allowed: true, remaining: limit - 1 };
    }

    // Атомарне збільшення в межах пам'яті
    record.count++;

    if (record.count > limit) {
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: Math.max(0, limit - record.count) };
  } catch (error) {
    console.error('Rate limit error:', error);
    // CWE-636: Fail-Closed
    throw new Error('Помилка перевірки ліміту запитів');
  }
}

export async function clearRateLimit(key: string) {
  rateLimitCache.delete(key);
}
