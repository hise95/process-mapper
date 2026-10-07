import sys

with open("src/middleware.ts", "r") as f:
    code = f.read()

import re

# Add edge cache at the top
if "const globalEdgeCache" not in code:
    cache_code = """
// CWE-400: Global Edge Rate Limiter Cache
interface EdgeRateLimit {
  count: number;
  expiresAt: number;
}
const globalEdgeCache = new Map<string, EdgeRateLimit>();
"""
    # Insert after imports
    code = code.replace("export async function middleware", cache_code + "\nexport async function middleware")

# Add the logic inside the mutation block
old_block = """  // Відхиляємо запити, більші за 5 MB, ще ДО того, як Node.js почне їх парсити
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {"""

new_block = """  // Відхиляємо запити, більші за 5 MB, ще ДО того, як Node.js почне їх парсити
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    // CWE-400: Global API Rate Limiting for Mutations (Policy over Exceptions)
    if (pathname.startsWith('/api/')) {
      const identifier = req.cookies.get('session')?.value || req.ip || req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
      // Просте хешування для Edge, щоб не зберігати сирий session_id
      let hash = 0;
      for (let i = 0; i < identifier.length; i++) {
        hash = ((hash << 5) - hash) + identifier.charCodeAt(i);
        hash |= 0;
      }
      const key = `mut_${hash}`;
      const now = Date.now();
      let record = globalEdgeCache.get(key);
      
      if (!record || record.expiresAt < now) {
        if (globalEdgeCache.size > 10000) globalEdgeCache.clear(); // OOM Protection
        globalEdgeCache.set(key, { count: 1, expiresAt: now + 60000 }); // 1 хв вікно
      } else {
        record.count++;
        if (record.count > 120) { // Макс 120 мутацій на хвилину на юзера/IP
          return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } });
        }
      }
    }
"""

code = code.replace(old_block, new_block)

with open("src/middleware.ts", "w") as f:
    f.write(code)
print("Patched middleware with global rate limit")
