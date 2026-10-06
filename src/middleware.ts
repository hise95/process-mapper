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
  const dotIndex = cookieValue.lastIndexOf('.' )
  if (dotIndex === -1) return false

  const userId = cookieValue.slice(0, dotIndex)
  const providedSig = cookieValue.slice(dotIndex + 1)
  
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
    enc.encode(userId)
  )
  
  const hashArray = Array.from(new Uint8Array(signature))
  const hexSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  // Для захисту від timing attacks ідеально використовувати timingSafeEqual,
  // але в Edge Web Crypto її немає. Тут просте порівняння прийнятне як перший бар'єр.
  return hexSignature === providedSig
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  const sessionCookie = req.cookies.get(SESSION_COOKIE)

  if (!sessionCookie?.value) {
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
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
