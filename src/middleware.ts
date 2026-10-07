// src/middleware.ts
// Захист роутів — перенаправлення на /login якщо немає cookie сесії
import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = 'pm-session'
const SESSION_SECRET = process.env.SESSION_SECRET || ''

// Публічні маршрути (не потребують авторизації)
const PUBLIC_PATHS = ['/login', '/api/auth']

// Web Crypto HMAC-SHA256 для Edge Runtime
async function verifyHmac(cookieValue: string): Promise<boolean> {
  if (!SESSION_SECRET || SESSION_SECRET.length < 32) return false;
  
  const parts = cookieValue.split('.');
  if (parts.length !== 3) return false;
  
  const [userId, expiresAtStr, providedSig] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);
  
  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return false; // Expired
  }
  
  const payload = `${userId}.${expiresAt}`;
  
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(payload)
  )
  
  const hashArray = Array.from(new Uint8Array(signature))
  const hexSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return hexSignature === providedSig
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // CWE-693: Nonce-based Strict CSP для Next.js
  const nonce = btoa(crypto.randomUUID())
  const cspHeader = process.env.NODE_ENV === "development" 
    ? `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';`
    : `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';`
  
  const contentSecurityPolicyHeaderValue = cspHeader.replace(/\s{2,}/g, ' ').trim()
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicyHeaderValue)

  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue);
  return response;
  }

  const sessionCookie = req.cookies.get(SESSION_COOKIE)

  if (!sessionCookie?.value) {
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
  }

  // CWE-613: Перевіряємо, чи сесія реально існує в базі (не була відкликана/видалена)
  // Оскільки Middleware працює на Edge, ми робимо fetch до нашого ж API, яке має доступ до Prisma
  try {
    const verifyUrl = new URL('/api/auth/me', req.url)
    const verifyReq = await fetch(verifyUrl, {
      headers: { cookie: req.headers.get('cookie') || '' }
    })
    
    if (!verifyReq.ok) {
      const loginUrl = new URL('/login', req.url)
      const res = NextResponse.redirect(loginUrl, { headers: requestHeaders })
      res.cookies.delete(SESSION_COOKIE)
      res.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue)
      return res
    }
  } catch (e) {
    // У разі мережевої помилки пропускаємо далі (fallback) – захист спрацює на рівні Server Component
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
