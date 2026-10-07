import sys

with open("src/middleware.ts", "r") as f:
    code = f.read()

import re

# Find the start of the POST/PUT/PATCH block
old_block = """  // CWE-352: Strict Origin/Referer Validation (Anti-CSRF)
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {"""

new_block = """  // CWE-400: Global Request Body Size Enforcement (Anti-OOM DoS)
  // Відхиляємо запити, більші за 5 MB, ще ДО того, як Node.js почне їх парсити
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024; // 5 MB
    const contentLength = req.headers.get('content-length');
    
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
      return new NextResponse('Payload Too Large (Exceeds 5MB)', { status: 413 });
    }
    
    // Блокуємо chunked-запити для JSON API, оскільки вони приховують реальний розмір
    // і можуть бути використані для обходу Content-Length ліміту
    const transferEncoding = req.headers.get('transfer-encoding');
    if (transferEncoding?.includes('chunked') && !contentLength) {
      return new NextResponse('Chunked encoding without Content-Length is not allowed', { status: 411 });
    }

    // CWE-352: Strict Origin/Referer Validation (Anti-CSRF)"""

code = code.replace(old_block, new_block)

with open("src/middleware.ts", "w") as f:
    f.write(code)
print("Patched middleware payload size")
