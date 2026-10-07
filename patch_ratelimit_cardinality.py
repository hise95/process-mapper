import sys

with open("src/lib/rateLimit.ts", "r") as f:
    code = f.read()

import re

# Add imports
if "import { createHash }" not in code:
    code = "import { createHash } from 'crypto';\n" + code

# Find checkRateLimit and replace key with hashedKey and add cardinality check
old_check = """export async function checkRateLimit(
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
    }"""

new_check = """export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    // CWE-200: Hash the key to avoid storing raw PII (like emails) in memory/logs
    const hashedKey = createHash('sha256').update(key).digest('hex');
    const now = Date.now();
    let record = rateLimitCache.get(hashedKey);

    // Якщо запису немає або він протермінований
    if (!record || record.expiresAt < now) {
      // CWE-400: Захист від роздування cardinality (OOM DoS) через довільні email-адреси
      if (rateLimitCache.size >= 50000) {
        // Очищаємо найстаріші 10% записів (Map зберігає порядок вставки)
        let evicted = 0;
        for (const [k] of rateLimitCache) {
          rateLimitCache.delete(k);
          if (++evicted >= 5000) break;
        }
      }
      record = { count: 1, expiresAt: now + windowMs };
      rateLimitCache.set(hashedKey, record);
      return { allowed: true, remaining: limit - 1 };
    }"""

code = code.replace(old_check, new_check)

# Patch clearRateLimit to use hashed key
old_clear = """export async function clearRateLimit(key: string) {
  rateLimitCache.delete(key);
}"""

new_clear = """export async function clearRateLimit(key: string) {
  const hashedKey = createHash('sha256').update(key).digest('hex');
  rateLimitCache.delete(hashedKey);
}"""

code = code.replace(old_clear, new_clear)

with open("src/lib/rateLimit.ts", "w") as f:
    f.write(code)
print("Patched rateLimit.ts for cardinality and hashing")
