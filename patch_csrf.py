import sys

with open("src/middleware.ts", "r") as f:
    code = f.read()

import re

old_middleware_start = """export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl"""

new_middleware_start = """export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // CWE-352: Strict Origin/Referer Validation (Anti-CSRF)
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    // Використовуємо x-forwarded-host, host або внутрішній host Next.js
    const expectedHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
    
    if (origin) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== expectedHost) {
          return new NextResponse('CSRF Protection: Origin mismatch', { status: 403 });
        }
      } catch (e) {
        return new NextResponse('CSRF Protection: Invalid Origin', { status: 403 });
      }
    } else if (referer) {
      try {
        const refererUrl = new URL(referer);
        if (refererUrl.host !== expectedHost) {
          return new NextResponse('CSRF Protection: Referer mismatch', { status: 403 });
        }
      } catch (e) {
        return new NextResponse('CSRF Protection: Invalid Referer', { status: 403 });
      }
    } else {
      // Згідно рекомендацій OWASP, якщо немає ані Origin, ані Referer, запит на мутацію відхиляється,
      // оскільки легітимні браузери завжди надсилають ці заголовки.
      return new NextResponse('CSRF Protection: Missing Origin/Referer headers', { status: 403 });
    }
  }"""

if old_middleware_start in code:
    code = code.replace(old_middleware_start, new_middleware_start)
    with open("src/middleware.ts", "w") as f:
        f.write(code)
    print("Patched CSRF validation")
else:
    print("Could not find middleware start")

