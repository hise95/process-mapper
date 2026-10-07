import sys

with open("src/middleware.ts", "r") as f:
    code = f.read()

import re

old_middleware_start = """export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl"""

new_middleware_start = """export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // CWE-693: Nonce-based Strict CSP для Next.js
  const nonce = btoa(crypto.randomUUID())
  const cspHeader = process.env.NODE_ENV === "development" 
    ? `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';`
    : `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';`
  
  const contentSecurityPolicyHeaderValue = cspHeader.replace(/\s{2,}/g, ' ').trim()
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicyHeaderValue)"""

code = code.replace(old_middleware_start, new_middleware_start)

# Now we need to pass `requestHeaders` to NextResponse.next() and NextResponse.redirect()
# And set the response header

# Replace NextResponse.next()
code = code.replace("return NextResponse.next()", """const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue);
  return response;""")

# Replace redirect
old_redirect = """  if (!sessionCookie?.value) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  const isValid = await verifyHmac(sessionCookie.value)
  if (!isValid) {
    const loginUrl = new URL('/login', req.url)
    // Видаляємо фальшиву/застарілу куку
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete(SESSION_COOKIE)
    return response
  }"""

new_redirect = """  if (!sessionCookie?.value) {
    const loginUrl = new URL('/login', req.url)
    const res = NextResponse.redirect(loginUrl, { headers: requestHeaders })
    res.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue)
    return res
  }

  const isValid = await verifyHmac(sessionCookie.value)
  if (!isValid) {
    const loginUrl = new URL('/login', req.url)
    const res = NextResponse.redirect(loginUrl, { headers: requestHeaders })
    res.cookies.delete(SESSION_COOKIE)
    res.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue)
    return res
  }"""

code = code.replace(old_redirect, new_redirect)

# Wait, there are multiple "return NextResponse.next()" in the file. The regex replace replaces all of them.
# Let's write the whole file to be safe.

with open("src/middleware.ts", "w") as f:
    f.write(code)
print("Patched middleware.ts")
