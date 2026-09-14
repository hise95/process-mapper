// src/middleware.ts
// Захист роутів — перенаправлення на /login якщо немає cookie сесії
import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = 'pm-session'

// Публічні маршрути (не потребують авторизації)
const PUBLIC_PATHS = ['/login', '/api/auth']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Пропустити публічні маршрути та статичні файли
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

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
