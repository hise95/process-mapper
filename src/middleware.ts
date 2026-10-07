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
  
  // CWE-208: Constant-time comparison to prevent HMAC timing attacks
  if (hexSignature.length !== providedSig.length) return false;
  let result = 0;
  for (let i = 0; i < hexSignature.length; i++) {
    result |= hexSignature.charCodeAt(i) ^ providedSig.charCodeAt(i);
  }
  return result === 0;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // CWE-400: Global Request Body Size Enforcement (Anti-OOM DoS)
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

    // CWE-352: Strict Origin/Referer Validation (Anti-CSRF)
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
  }
  
  // CWE-693: Nonce-based Strict CSP для Next.js
  const nonce = btoa(crypto.randomUUID())
  const cspHeader = process.env.NODE_ENV === "development" 
    ? `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'strict-dynamic'; style-src 'self' 'nonce-${nonce}'; style-src-attr 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';`
    : `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; style-src 'self' 'nonce-${nonce}'; style-src-attr 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';`
  
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
    
    let rotatedCookie: string | null = null;
    if (!verifyReq.ok) {
      const loginUrl = new URL('/login', req.url)
      const res = NextResponse.redirect(loginUrl, { headers: requestHeaders })
      res.cookies.delete(SESSION_COOKIE)
      res.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue)
      return res
    } else {
      // Якщо auth/me ініціював Session Rotation, забираємо новий Set-Cookie
      rotatedCookie = verifyReq.headers.get('set-cookie');
    }
    
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue);
    
    if (rotatedCookie) {
      // Прокидуємо новий cookie клієнту (CWE-384)
      response.headers.set('Set-Cookie', rotatedCookie);
    }
    
    return response;
  } catch (e) {
    // У разі мережевої помилки пропускаємо далі (fallback)
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue);
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
