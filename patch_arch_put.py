import sys

with open("src/app/api/architecture/route.ts", "r") as f:
    code = f.read()

import re

old_put = """  try {
    const body = await req.json();
    
    // Перевірка схеми, розміру та вкладеності (CWE-400 / Point 23)"""

new_put = """  try {
    // CWE-400: Запобігання Body Parsing DoS. Перевіряємо заголовок (швидкий відбій).
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 500 * 1024) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
    
    // CWE-400: Надійний захист через читання потоку (захист від chunked spoofing).
    if (!req.body) return NextResponse.json({ error: 'Empty body' }, { status: 400 });
    
    const reader = req.body.getReader();
    let totalSize = 0;
    const chunks: Uint8Array[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalSize += value.length;
        if (totalSize > 500 * 1024) {
          // Зупиняємо парсинг до того, як пам'ять буде переповнена
          return NextResponse.json({ error: 'Payload too large (max 500KB)' }, { status: 413 });
        }
        chunks.push(value);
      }
    }
    
    let length = 0;
    for (const c of chunks) length += c.length;
    const result = new Uint8Array(length);
    let offset = 0;
    for (const c of chunks) {
      result.set(c, offset);
      offset += c.length;
    }
    
    const bodyStr = new TextDecoder().decode(result);
    const body = JSON.parse(bodyStr);
    
    // Перевірка схеми, розміру та вкладеності (CWE-400 / Point 23)"""

if old_put in code:
    code = code.replace(old_put, new_put)
    with open("src/app/api/architecture/route.ts", "w") as f:
        f.write(code)
    print("Patched architecture PUT stream reader")
else:
    print("Could not find PUT block")
